namespace AWSManageConsole.Commands.AWS.SecurityGroups;

internal class RemoveSecurityGroupCommand : BaseCommand
{
	public RemoveSecurityGroupCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
	public override string Name => "[Security Group] Remove Security Group";
	public override async Task ExecuteAsync()
	{
		string securityGroupId = "Enter the Security Group ID to remove: ".ReadValue<string>();
		if (string.IsNullOrWhiteSpace(securityGroupId))
		{
			"Security Group ID cannot be empty. Operation cancelled.".WriteError();
			return;
		}

		AmazonEC2Client ec2Client = _awsService.GetEC2Client();
		DeleteSecurityGroupRequest request = new()
		{
			GroupId = securityGroupId
		};
		try
		{
			if ("Sure you want to delete Security Group with ID {securityGroupId}? This action cannot be undone.".ConfirmAction())
			{
				await ec2Client.DeleteSecurityGroupAsync(request);
				$"Successfully removed Security Group with ID {securityGroupId}.".WriteSuccess();
			}
			else
			{
				"Operation cancelled by user.".WriteInfo();
			}
		}
		catch (Exception ex)
		{
			ex.Message.WriteError();
		}
	}
}
