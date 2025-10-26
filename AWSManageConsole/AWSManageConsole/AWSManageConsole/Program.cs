using Microsoft.Extensions.Configuration;

namespace AWSManageConsole;

internal class Program
{
	static async Task Main(string[] args)
	{
		// Build configuration from appsettings.json and environment variables
		IConfiguration configuration = new ConfigurationBuilder()
			.SetBasePath(Directory.GetCurrentDirectory())
			.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
			.Build();

		// Configure DI
		IServiceCollection service = new ServiceCollection();

		// Register IConfiguration so it can be injected where needed
		service.AddSingleton(configuration);

		// Existing registrations
		service.AddSingleton<IConfigurationService, ConfigurationService>();

		ServiceProvider provider = service.BuildServiceProvider();
		IConfigurationService configService = provider.GetRequiredService<IConfigurationService>();

		"Willkommen in der AWS Console".WriteInfo();

		SelectCommand selectCommand = new(provider);
		await selectCommand.ExecuteAsync();
	}
}
