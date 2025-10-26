namespace AWSManageConsole.Commands.SecurityGroups;

internal class GetSecurityGroupDetailsCommand : BaseCommand
{
	public GetSecurityGroupDetailsCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
	public override string Name => "[Security Group] Get Security Group Details";
	public override async Task ExecuteAsync()
	{
		string groupId = "Enter the Security Group ID to retrieve details: ".ReadValue<string>();
		if (string.IsNullOrWhiteSpace(groupId))
		{
			"Security Group ID cannot be empty. Operation cancelled.".WriteError();
			return;
		}

		await GetSecurityGroupDetails(groupId);
	}

	public async Task GetSecurityGroupDetails(string groupId)
	{
		AmazonEC2Client ec2Client = _awsService.GetEC2Client();
		DescribeSecurityGroupsRequest request = new()
		{
			GroupIds = new List<string> { groupId }
		};
		try
		{
			DescribeSecurityGroupsResponse response = await ec2Client.DescribeSecurityGroupsAsync(request);
			SecurityGroup sg = response.SecurityGroups.FirstOrDefault()!;
			if (sg == null)
			{
				$"No Security Group found with ID {groupId}.".WriteError();
				return;
			}

			List<string[]> table =
			[
				["Property", "Value"],
				["Group ID", sg.GroupId],
				["Group Name", sg.GroupName],
				["Description", sg.Description],
				["VPC ID", sg.VpcId ?? "N/A"],
				["Inbound Rules", sg.IpPermissions.Count.ToString()],
				["Outbound Rules", sg.IpPermissionsEgress.Count.ToString()]
			];

			table.PrintTable();

			Console.WriteLine();
			"Inbound Rules:".WriteLine(ConsoleColor.Cyan);
			foreach (IpPermission permission in sg.IpPermissions)
			{
				string cidrIps = string.Join(", ", permission.Ipv4Ranges.Select(r => r.CidrIp));
				$"- Protocol: {permission.IpProtocol}, From Port: {permission.FromPort?.ToString() ?? "All"}, To Port: {permission.ToPort?.ToString() ?? "All"}, Cidr IPs: {cidrIps}".WriteInfo();
			}

			Console.WriteLine();
			"Outbound Rules:".WriteLine(ConsoleColor.Cyan);
			foreach (IpPermission permission in sg.IpPermissionsEgress)
			{
				string cidrIps = string.Join(", ", permission.Ipv4Ranges.Select(r => r.CidrIp));
				$"- Protocol: {permission.IpProtocol}, From Port: {permission.FromPort?.ToString() ?? "All"}, To Port: {permission.ToPort?.ToString() ?? "All"}, Cidr IPs: {cidrIps}".WriteInfo();
			}
		}
		catch (Exception ex)
		{
			ex.Message.WriteError();
		}
	}
}
