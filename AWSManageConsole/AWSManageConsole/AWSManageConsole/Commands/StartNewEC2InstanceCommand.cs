namespace AWSManageConsole.Commands;

internal class StartNewEC2InstanceCommand : BaseCommand
{
	public StartNewEC2InstanceCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }

	public override string Name => "Start New EC2 Instance";

	public override async Task ExecuteAsync()
	{
		string instanceName = "Enter an instance name for the new EC2 instance:".ReadValue<string>();
		if (string.IsNullOrWhiteSpace(instanceName))
		{
			"Instance name cannot be empty. Operation cancelled.".WriteError();
			return;
		}

		AmazonEC2Client ec2Client = _awsService.GetEC2Client();

		string imageId = "ami-04c08fd8aa14af291";
		InstanceType instanceType = InstanceType.T3Micro;

		Console.WriteLine($"Attempting to launch a new EC2 instance: {instanceName} ({instanceType.Value})...");

		RunInstancesRequest runRequest = new()
		{
			ImageId = imageId,
			InstanceType = instanceType,
			MinCount = 1, // Start at least 1 instance
			MaxCount = 1, // Start no more than 1 instance
			KeyName = "awdev-key",
			SecurityGroupIds = new List<string> { "sg-01fc9ede50813de41" }
		};

		try
		{
			RunInstancesResponse runResponse = await ec2Client.RunInstancesAsync(runRequest);

			Instance newInstance = runResponse.Reservation.Instances.FirstOrDefault();

			if (newInstance == null)
			{
				Console.WriteLine("Error: Instance launch request succeeded but no instance was returned.");
				return;
			}

			string instanceId = newInstance.InstanceId;
			Console.WriteLine($"Successfully requested instance launch. New Instance ID: {instanceId}");

			Tag nameTag = new() { Key = "Name", Value = instanceName };
			CreateTagsRequest tagRequest = new()
			{
				Resources = new List<string> { instanceId },
				Tags = new List<Tag> { nameTag }
			};

			await ec2Client.CreateTagsAsync(tagRequest);
			Console.WriteLine($"Instance {instanceId} tagged with Name: '{instanceName}'.");

			// 4. Display the pending state
			Console.WriteLine($"The instance is currently in state: {newInstance.State.Name.Value}");

			List<string[]> table =
			[
				["Key", "Value"],
				["Instance ID", instanceId],
				["Instance Type", instanceType.Value],
				["AMI ID", imageId],
				["Requested Name", instanceName],
				["Current State", newInstance.State.Name.Value],
				["Public IP", newInstance.PublicIpAddress ?? "N/A"]
			];

			// Assuming PrintTable is an extension method for List<string[]>
			table.PrintTable();
		}
		catch (AmazonEC2Exception ex)
		{
			Console.WriteLine($"Failed to launch EC2 instance. Error Code: {ex.ErrorCode}");
			Console.WriteLine($"Message: {ex.Message}");
		}
		catch (Exception ex)
		{
			Console.WriteLine($"An unexpected error occurred: {ex.Message}");
		}

		await SelectCommandAsync();
	}
}
