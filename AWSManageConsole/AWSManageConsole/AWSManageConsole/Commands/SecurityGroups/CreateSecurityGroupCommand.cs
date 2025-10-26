namespace AWSManageConsole.Commands.SecurityGroups;

internal class CreateSecurityGroupCommand : BaseCommand
{
	public CreateSecurityGroupCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
	public override string Name => "[Security Group] Create Security Group";
	public override async Task ExecuteAsync()
	{
		var defaultVpcId = _configurationService.LoadAwsConfiguration().DefaultVpcId;

		string groupName = "Enter the name for the new Security Group: ".ReadValue<string>();
		string description = "Enter a description for the new Security Group: ".ReadValue<string>();
		string? vpcId = "Enter the VPC ID for the new Security Group (leave blank for default VPC): ".ReadValue<string>();

		if (string.IsNullOrWhiteSpace(vpcId))
		{
			vpcId = defaultVpcId;
			$"No VPC ID provided. Using default VPC ID: {vpcId}".WriteInfo();
		}

		if (string.IsNullOrWhiteSpace(groupName) || string.IsNullOrWhiteSpace(description))
		{
			"Group name and description cannot be empty. Operation cancelled.".WriteError();
			return;
		}
		AmazonEC2Client ec2Client = _awsService.GetEC2Client();
		CreateSecurityGroupRequest request = new()
		{
			GroupName = groupName,
			Description = description,
			VpcId = vpcId
		};
		try
		{
			CreateSecurityGroupResponse response = await ec2Client.CreateSecurityGroupAsync(request);
			$"Successfully created Security Group with ID {response.GroupId}.".WriteSuccess();
		}
		catch (Exception ex)
		{
			ex.Message.WriteError();
		}
	}
}
