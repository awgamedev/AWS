namespace AWSManageConsole.Commands.AWS.SecurityGroups;

internal class GetRulesForSecurityGroupCommand : BaseCommand
{
	public GetRulesForSecurityGroupCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }

	public override string Name => "[Security Group] Get Rules for a Security Group";

	public override async Task ExecuteAsync()
	{
		string securityGroupId = "Enter the Security Group ID to retrieve rules for: ".ReadValue<string>();
		if (string.IsNullOrWhiteSpace(securityGroupId))
		{
			"Security Group ID cannot be empty. Operation cancelled.".WriteError();
			return;
		}

		AmazonEC2Client ec2Client = _awsService.GetEC2Client();

		DescribeSecurityGroupsRequest request = new()
		{
			GroupIds = new List<string> { securityGroupId }
		};
		try
		{
			DescribeSecurityGroupsResponse response = await ec2Client.DescribeSecurityGroupsAsync(request);
			SecurityGroup? sg = response?.SecurityGroups?.FirstOrDefault();
			if (sg == null)
			{
				$"Security Group with ID {securityGroupId} not found.".WriteError();
				return;
			}

			List<string[]> table =
			[
				[
					"Protocol",
					"From Port",
					"To Port",
					"Cidr IPs"
				],
			];

			foreach (IpPermission permission in sg.IpPermissions)
			{
				string cidrIps = string.Join(", ", permission.Ipv4Ranges.Select(r => r.CidrIp));
				table.Add(
				[
					permission.IpProtocol,
					permission.FromPort?.ToString() ?? "All",
					permission.ToPort?.ToString() ?? "All",
					cidrIps
				]);
			}

			table.PrintTable();
		}
		catch (Exception ex)
		{
			ex.Message.WriteError();
		}
	}
}
