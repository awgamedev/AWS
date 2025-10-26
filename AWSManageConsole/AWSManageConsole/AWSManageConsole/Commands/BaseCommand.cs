namespace AWSManageConsole.Commands;

internal abstract class BaseCommand
{
	protected readonly IServiceProvider _serviceProvider;
	protected readonly IConfigurationService _configurationService;
	protected readonly IAWSService _awsService;

	protected BaseCommand(IServiceProvider serviceProvider)
	{
		_serviceProvider = serviceProvider;
		_configurationService = serviceProvider.GetService<IConfigurationService>()!;
		_awsService = serviceProvider.GetService<IAWSService>()!;
	}

	public abstract string Name { get; }
	public abstract Task ExecuteAsync();

	public async Task SelectCommandAsync()
	{
		SelectCommand selectCommand = new(_serviceProvider);
		await selectCommand.ExecuteAsync();
	}
}
