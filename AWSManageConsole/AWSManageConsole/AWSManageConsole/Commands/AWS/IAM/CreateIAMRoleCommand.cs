namespace AWSManageConsole.Commands.AWS.IAM;

// NOT YET TESTED
internal class CreateIAMRoleCommand : BaseCommand
{
	public CreateIAMRoleCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
	public override string Name => "[IAM] Create IAM Role";
	public override async Task ExecuteAsync()
	{
		//AmazonIdentityManagementServiceClient iamClient = _awsService.GetIAMClient();
		//string roleName = "Enter the name for the new IAM Role: ".ReadValue<string>();
		//if (string.IsNullOrWhiteSpace(roleName))
		//{
		//	"Role name cannot be empty.".WriteError();
		//	return;
		//}
		//try
		//{
		//	CreateRoleRequest request = new()
		//	{
		//		RoleName = roleName,
		//		AssumeRolePolicyDocument = "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"ec2.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}"
		//	};
		//	CreateRoleResponse response = await iamClient.CreateRoleAsync(request);
		//	$"Successfully created IAM Role with Name: {response.Role.RoleName}, ID: {response.Role.RoleId}.".WriteSuccess();
		//}
		//catch (Exception ex)
		//{
		//	ex.Message.WriteError();
		//}
	}
}
