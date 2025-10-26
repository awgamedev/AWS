using Microsoft.Extensions.Configuration;

namespace AWSManageConsole.Services;

internal interface IConfigurationService
{
	AWSConfiguration LoadAwsConfiguration();
}

internal class ConfigurationService : IConfigurationService
{
	private readonly IConfiguration _configuration;
	public ConfigurationService(IConfiguration configuration)
	{
		_configuration = configuration;
	}

	public AWSConfiguration LoadAwsConfiguration()
	{
		AWSConfiguration? config = _configuration.GetSection("AWSConfiguration").Get<AWSConfiguration>();

		if (config == null)
		{
			throw new InvalidOperationException("AWS configuration section is missing in the configuration file.");
		}

		if (!config.IsValid())
		{
			throw new InvalidOperationException("AWS configuration is invalid or incomplete. Please check your configuration settings.");
		}

		return config;
	}
}
