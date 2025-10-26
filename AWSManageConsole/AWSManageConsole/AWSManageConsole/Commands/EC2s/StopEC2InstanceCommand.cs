namespace AWSManageConsole.Commands.EC2;

internal class StopEC2InstanceCommand : BaseCommand
{
	public StopEC2InstanceCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
	public override string Name => "[EC2] Stop EC2 Instance";
	public override async Task ExecuteAsync()
	{
		string instanceId = "Enter the Instance ID of the EC2 instance to stop: ".ReadValue<string>();
		if (string.IsNullOrWhiteSpace(instanceId))
		{
			"Instance ID cannot be empty. Operation cancelled.".WriteError();
			return;
		}

		AmazonEC2Client ec2Client = _awsService.GetEC2Client();
		StopInstancesRequest stopRequest = new()
		{
			InstanceIds = new List<string> { instanceId }
		};

		try
		{
			StopInstancesResponse stopResponse = await ec2Client.StopInstancesAsync(stopRequest);
			Console.WriteLine($"Successfully requested to stop instance {instanceId}.");
			foreach (InstanceStateChange change in stopResponse.StoppingInstances)
			{
				Console.WriteLine($"Instance {change.InstanceId} state changed from {change.PreviousState.Name.Value} to {change.CurrentState.Name.Value}.");
			}
		}
		catch (AmazonEC2Exception ex)
		{
			Console.WriteLine($"Failed to stop EC2 instance. Error Code: {ex.ErrorCode}");
			Console.WriteLine($"Message: {ex.Message}");
		}
		catch (Exception ex)
		{
			Console.WriteLine($"An unexpected error occurred: {ex.Message}");
		}
	}
}
