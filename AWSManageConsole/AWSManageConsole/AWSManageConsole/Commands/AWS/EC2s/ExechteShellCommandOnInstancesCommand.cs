
namespace AWSManageConsole.Commands.AWS.EC2s;

internal class ExechteShellCommandOnInstancesCommand : BaseCommand
{
	public ExechteShellCommandOnInstancesCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
	public override string Name => "[EC2] Execute Shell Command on Instances";
	public override async Task ExecuteAsync()
	{
		// 1. Get User Input and Validation
		string publicIp = "Enter the public ip of the ecs instance: ".ReadValue<string>();
		if (string.IsNullOrWhiteSpace(publicIp))
		{
			"public ip cannot be empty. Operation cancelled.".WriteError();
			return;
		}

		string shellCommand = "Enter the shell command to execute on the instance: ".ReadValue<string>();
		if (string.IsNullOrWhiteSpace(shellCommand))
		{
			"Shell command cannot be empty. Operation cancelled.".WriteError();
			return;
		}

		// 2. Find Instance ID from Public IP
		string? instanceId = await _awsService.FindInstanceIdByPublicIpAsync(publicIp);

		if (string.IsNullOrWhiteSpace(instanceId))
		{
			$"No running EC2 instance found with Public IP: {publicIp}".WriteError();
			return;
		}

		$"Found instance ID: {instanceId}".WriteInfo();

		// 3. Execute Command via AWS Systems Manager (SSM)
		string? commandId = await _awsService.ExecuteSsmCommandAsync(instanceId, shellCommand);

		if (string.IsNullOrWhiteSpace(commandId))
		{
			"Failed to initiate command execution via SSM.".WriteError();
			return;
		}

		$"SSM Command initiated successfully. Command ID: {commandId}".WriteSuccess();

		// 4. Poll and Get Command Output
		CommandOutput output = await _awsService.GetCommandOutputAsync(commandId, instanceId);

		if (output == null)
		{
			"Failed to retrieve command output.".WriteError();
			return;
		}

		if (output.StandardOutputContent != null)
		{
			"Command Output:".WriteLine(ConsoleColor.Cyan);
			output.StandardOutputContent.WriteInfo();
		}

		if (output.StandardErrorContent != null)
		{
			"Command Error Output:".WriteLine(ConsoleColor.Red);
			output.StandardErrorContent.WriteError();
		}
	}
}
