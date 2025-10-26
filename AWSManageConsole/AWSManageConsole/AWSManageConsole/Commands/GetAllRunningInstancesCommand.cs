namespace AWSManageConsole.Commands;

internal class GetAllRunningInstancesCommand : BaseCommand
{
	public GetAllRunningInstancesCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }

	public override string Name => "Get All Running EC2 Instances";

	public override async Task ExecuteAsync()
	{
		AmazonEC2Client ec2Client = _awsService.GetEC2Client();

		Filter runningInstancesFilter = new()
		{
			Name = "instance-state-name",
			Values = new List<string> { "running" }
		};

		DescribeInstancesRequest request = new()
		{
			Filters = new List<Filter> { runningInstancesFilter }
		};

		// Using the asynchronous approach is recommended
		DescribeInstancesResponse response = await ec2Client.DescribeInstancesAsync(request);

		List<string[]> table =
		[
			[
				"Instance ID",
				"Instance Type",
				"State",
				"Public IP",
				"Name"
			],
		];

		foreach (Reservation? reservation in response.Reservations)
		{
			foreach (Instance? instance in reservation.Instances)
			{
				table.Add(
				[
					instance.InstanceId,
					instance.InstanceType.Value,
					instance.State.Name.Value,
					instance.PublicIpAddress ?? "N/A",
					instance.Tags?.FirstOrDefault(t => t.Key == "Name")?.Value ?? "N/A"
				]);
			}
		}

		table.PrintTable();
	}
}
