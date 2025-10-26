using AWSManageConsole.Config;
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
		return _configuration.GetSection("AWSConfiguration").Get<AWSConfiguration>() ?? new AWSConfiguration();
	}
}
