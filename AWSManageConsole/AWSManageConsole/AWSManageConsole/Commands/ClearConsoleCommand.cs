namespace AWSManageConsole.Commands;

internal class ClearConsoleCommand : BaseCommand
{
	public ClearConsoleCommand(IServiceProvider serviceProvider) : base(serviceProvider) { }
	public override string Name => "Clear Console";
	public override async Task ExecuteAsync()
	{
		Console.Clear();
	}
}
