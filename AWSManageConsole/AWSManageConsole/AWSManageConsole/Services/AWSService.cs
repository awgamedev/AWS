using Amazon.SimpleSystemsManagement;
using Amazon.SimpleSystemsManagement.Model;
using AWSManageConsole.Models;

namespace AWSManageConsole.Services;

internal interface IAWSService
{
	Task<string?> ExecuteSsmCommandAsync(string instanceId, string shellCommand, int timeoutSeconds = 60);
	Task<string?> FindInstanceIdByPublicIpAsync(string publicIp);
	AWSCredentials GetAWSCredentials();
	Task<CommandOutput> GetCommandOutputAsync(string commandId, string instanceId, int maxPollAttempts = 12);
	AmazonEC2Client GetEC2Client();
}

internal class AWSService : IAWSService
{
	private readonly IConfigurationService _configurationService;
	public AWSService(IConfigurationService configurationService)
	{
		_configurationService = configurationService;
	}

	public AWSCredentials GetAWSCredentials()
	{
		AWSConfiguration awsConfig = _configurationService.LoadAwsConfiguration();

		AWSCredentials credentials = new CredentialProfileStoreChain()
			.TryGetAWSCredentials(awsConfig.ProfileName, out AWSCredentials? creds) && creds != null
			? creds
			: throw new InvalidOperationException($"Could not load AWS credentials for profile '{awsConfig.ProfileName}'.");

		return credentials;
	}

	public AmazonEC2Client GetEC2Client()
	{
		AWSConfiguration awsConfig = _configurationService.LoadAwsConfiguration();
		AWSCredentials credentials = GetAWSCredentials();
		RegionEndpoint region = RegionEndpoint.GetBySystemName(awsConfig.Region);
		return new AmazonEC2Client(credentials, region);
	}

	/// <summary>
	/// Retrieves the instance ID for a running EC2 instance based on its public IP address.
	/// </summary>
	/// <param name="publicIp">The public IP address of the EC2 instance.</param>
	/// <returns>Returns the instance ID if found; otherwise, null.</returns>
	public async Task<string?> FindInstanceIdByPublicIpAsync(string publicIp)
	{
		AmazonEC2Client ec2Client = GetEC2Client();

		DescribeInstancesRequest request = new()
		{
			Filters = new List<Filter>
			{
				new("ip-address", new List<string> { publicIp }),
				new("instance-state-name", new List<string> { "running" })
			}
		};

		try
		{
			DescribeInstancesResponse response = await ec2Client.DescribeInstancesAsync(request);
			Reservation? reservation = response.Reservations.FirstOrDefault();
			Instance? instance = reservation?.Instances.FirstOrDefault();
			return instance?.InstanceId;
		}
		catch
		{
			return null;
		}
	}

	/// <summary>
	/// Polls the SSM API for the command output and status.
	/// </summary>
	public async Task<CommandOutput> GetCommandOutputAsync(string commandId, string instanceId, int maxPollAttempts = 12)
	{
		AmazonSimpleSystemsManagementClient ssmClient = GetSSMClient();

		if (maxPollAttempts <= 0)
		{
			throw new ArgumentOutOfRangeException(nameof(maxPollAttempts), "Max poll attempts must be greater than zero.");
		}

		for (int i = 0; i < maxPollAttempts; i++)
		{
			await Task.Delay(TimeSpan.FromSeconds(10));

			GetCommandInvocationRequest request = new()
			{
				CommandId = commandId,
				InstanceId = instanceId
			};

			try
			{
				GetCommandInvocationResponse response = await ssmClient.GetCommandInvocationAsync(request);

				// Check for completion status
				if (response.Status == CommandInvocationStatus.Success ||
					response.Status == CommandInvocationStatus.Failed)
				{
					CommandOutput output = new(
						status: response.Status,
						standardOutputContent: response.StandardOutputContent,
						standardErrorContent: response.StandardErrorContent
					);

					return output;
				}
			}
			catch
			{
			}
		}

		throw new TimeoutException("Exceeded maximum polling attempts without receiving command output.");
	}

	/// <summary>
	/// Executes a shell command on the specified EC2 instance via SSM and returns the command ID.
	/// </summary>
	/// <param name="instanceId">The ID of the EC2 instance.</param>
	/// <param name="shellCommand">The shell command to execute.</param>
	/// <param name="timeoutSeconds">The command timeout in seconds.</param>
	/// <returns>Returns the command ID if successful; otherwise, null.</returns>
	public async Task<string?> ExecuteSsmCommandAsync(string instanceId, string shellCommand, int timeoutSeconds = 60)
	{
		AmazonSimpleSystemsManagementClient ssmClient = GetSSMClient();

		SendCommandRequest request = new()
		{
			InstanceIds = new List<string> { instanceId },
			// AWS-RunShellScript for Linux or AWS-RunPowerShellScript for Windows
			DocumentName = "AWS-RunShellScript",
			Parameters = new Dictionary<string, List<string>>
			{
				{ "commands", new List<string> { shellCommand } }
			},
			TimeoutSeconds = timeoutSeconds
		};

		try
		{
			SendCommandResponse response = await ssmClient.SendCommandAsync(request);
			return response.Command?.CommandId;
		}
		catch
		{
			throw;
		}
	}

	// ##############################################################################################
	// - Private Helpers -
	// ##############################################################################################

	private AmazonSimpleSystemsManagementClient GetSSMClient()
	{
		AWSConfiguration awsConfig = _configurationService.LoadAwsConfiguration();
		RegionEndpoint region = RegionEndpoint.GetBySystemName(awsConfig.Region);
		AmazonSimpleSystemsManagementClient ssmClient = new(GetAWSCredentials(), region);
		return ssmClient;
	}
}
