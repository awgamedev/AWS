namespace AWSManageConsole.Services;

internal interface IAWSService
{
	AWSCredentials GetAWSCredentials();
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
}
