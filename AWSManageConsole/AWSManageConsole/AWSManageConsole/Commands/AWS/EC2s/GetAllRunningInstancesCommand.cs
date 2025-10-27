namespace AWSManageConsole.Commands.AWS.EC2s;

internal class GetAllRunningInstancesCommand : BaseCommand
{
	public GetAllRunningInstancesCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }

	public override string Name => "[EC2] Get All Running EC2 Instances";

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
				"Name",
				"Security Groups"
			],
		];

		if (response.Reservations == null || response.Reservations.Count == 0)
		{
			"No running EC2 instances found.".WriteInfo();
			return;
		}

		foreach (Reservation reservation in response.Reservations)
		{
			if (reservation.Instances == null || reservation.Instances.Count == 0)
			{
				continue;
			}

			foreach (Instance instance in reservation.Instances)
			{
				table.Add(
				[
					instance.InstanceId,
					instance.InstanceType.Value,
					instance.State.Name.Value,
					instance.PublicIpAddress ?? "N/A",
					instance.Tags?.FirstOrDefault(t => t.Key == "Name")?.Value ?? "N/A",
					instance.SecurityGroups != null
						? string.Join(", ", instance.SecurityGroups.Select(sg => sg.GroupName))
						: "N/A"
				]);
			}
		}

		table.PrintTable();
	}
}
