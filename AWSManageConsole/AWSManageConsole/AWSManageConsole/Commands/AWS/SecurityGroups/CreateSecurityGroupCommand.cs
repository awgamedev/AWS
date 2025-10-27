//namespace AWSManageConsole.Commands.AWS.SecurityGroups;

//internal class GetIAMRolesCommand : BaseCommand
//{
//	public GetIAMRolesCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
//	public override string Name => "[IAM] Get All IAM Roles";
//	public override async Task ExecuteAsync()
//	{
//		AmazonIdentityManagementServiceClient iamClient = _awsService.GetIAMClient();
//		ListRolesResponse response = await iamClient.ListRolesAsync(new ListRolesRequest());
//		List<string[]> table =
//		[
//			[
//				"Role Name",
//				"Role ID",
//				"ARN",
//				"Create Date"
//			],
//		];
//		if (response.Roles == null || response.Roles.Count == 0)
//		{
//			"No IAM roles found.".WriteInfo();
//			return;
//		}
//		foreach (Role role in response.Roles)
//		{
//			table.Add(
//			[
//				role.RoleName,
//				role.RoleId,
//				role.Arn,
//				role.CreateDate.ToString("yyyy-MM-dd HH:mm:ss")
//			]);
//		}
//		table.PrintTable();
//	}
//}

//internal class CreateSecurityGroupCommand : BaseCommand
//{
//	public CreateSecurityGroupCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
//	public override string Name => "[Security Group] Create Security Group";
//	public override async Task ExecuteAsync()
//	{
//		string defaultVpcId = _configurationService.LoadAwsConfiguration().DefaultVpcId;

//		string groupName = "Enter the name for the new Security Group: ".ReadValue<string>();
//		string description = "Enter a description for the new Security Group: ".ReadValue<string>();
//		string? vpcId = "Enter the VPC ID for the new Security Group (leave blank for default VPC): ".ReadValue<string>();

//		if (string.IsNullOrWhiteSpace(vpcId))
//		{
//			vpcId = defaultVpcId;
//			$"No VPC ID provided. Using default VPC ID: {vpcId}".WriteInfo();
//		}

//		if (string.IsNullOrWhiteSpace(groupName) || string.IsNullOrWhiteSpace(description))
//		{
//			"Group name and description cannot be empty. Operation cancelled.".WriteError();
//			return;
//		}
//		AmazonEC2Client ec2Client = _awsService.GetEC2Client();
//		CreateSecurityGroupRequest request = new()
//		{
//			GroupName = groupName,
//			Description = description,
//			VpcId = vpcId
//		};
//		try
//		{
//			CreateSecurityGroupResponse response = await ec2Client.CreateSecurityGroupAsync(request);
//			$"Successfully created Security Group with ID {response.GroupId}.".WriteSuccess();
//		}
//		catch (Exception ex)
//		{
//			ex.Message.WriteError();
//		}
//	}
//}
