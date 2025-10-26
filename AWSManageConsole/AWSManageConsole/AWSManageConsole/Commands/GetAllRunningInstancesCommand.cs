
namespace AWSManageConsole.Commands;

internal class GetAllRunningInstancesCommand : BaseCommand
{
	public GetAllRunningInstancesCommand(IServiceProvider serviceProvider) : base(serviceProvider)
	{
	}

	public override string Name => "Get All Running EC2 Instances";

	public override async Task ExecuteAsync()
	{
		// 1. Specify the profile name you want to use
		const string ProfileName = "default";

		// 2. Load the credentials for that profile
		AWSCredentials credentials = new CredentialProfileStoreChain()
			.TryGetAWSCredentials(ProfileName, out AWSCredentials? creds) && creds != null
			? creds
			: throw new InvalidOperationException($"Could not load AWS credentials for profile '{ProfileName}'.");

		// 3. Create the client with the loaded credentials
		RegionEndpoint region = RegionEndpoint.GetBySystemName("eu-north-1");
		AmazonEC2Client ec2Client = new(credentials, region);

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
