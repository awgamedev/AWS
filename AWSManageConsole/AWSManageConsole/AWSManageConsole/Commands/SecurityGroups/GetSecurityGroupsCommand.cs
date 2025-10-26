namespace AWSManageConsole.Commands.SecurityGroups;

internal class GetSecurityGroupsCommand : BaseCommand
{
	public GetSecurityGroupsCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
	public override string Name => "[Security Group] Get Security Groups";
	public override async Task ExecuteAsync()
	{
		AmazonEC2Client ec2Client = _awsService.GetEC2Client();
		DescribeSecurityGroupsResponse response = await ec2Client.DescribeSecurityGroupsAsync();
		List<string[]> table =
		[
			[
				"Group ID",
				"Group Name",
				"VPC ID"
			],
		];
		foreach (SecurityGroup sg in response.SecurityGroups)
		{
			table.Add(
			[
				sg.GroupId,
				sg.GroupName,
				sg.VpcId ?? "N/A"
			]);
		}
		table.PrintTable();
	}
}
