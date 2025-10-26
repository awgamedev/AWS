namespace AWSManageConsole.Commands;

internal abstract class BaseCommand
{
	public abstract string Name { get; }
	public abstract Task ExecuteAsync();
}
