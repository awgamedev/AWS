namespace AWSManageConsole.Services;

internal class AWSService
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
}
