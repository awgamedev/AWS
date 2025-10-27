using Amazon.IdentityManagement;
using Amazon.IdentityManagement.Model;

namespace AWSManageConsole.Commands.AWS.IAM;

internal class GetIAMRolesCommand : BaseCommand
{
	public GetIAMRolesCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
	public override string Name => "[IAM] Get All IAM Roles";
	public override async Task ExecuteAsync()
	{
		AmazonIdentityManagementServiceClient iamClient = _awsService.GetIAMClient();
		ListRolesResponse response = await iamClient.ListRolesAsync(new ListRolesRequest());
		List<string[]> table =
		[
			[
				"Role Name",
				"Role ID",
				//"ARN",
				"Create Date"
			],
		];
		if (response.Roles == null || response.Roles.Count == 0)
		{
			"No IAM roles found.".WriteInfo();
			return;
		}
		foreach (Role role in response.Roles)
		{
			table.Add(
			[
				role.RoleName,
				role.RoleId,
				//role.Arn,
				role.CreateDate?.ToString("yyyy-MM-dd HH:mm:ss") ?? "N/A"
			]);
		}
		table.PrintTable();
	}
}
