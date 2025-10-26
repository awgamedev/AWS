namespace AWSManageConsole.Commands;

internal abstract class BaseCommand
{
	protected readonly IServiceProvider _serviceProvider;
	protected BaseCommand(IServiceProvider serviceProvider)
	{
		_serviceProvider = serviceProvider;
	}

	public abstract string Name { get; }
	public abstract Task ExecuteAsync();
}
