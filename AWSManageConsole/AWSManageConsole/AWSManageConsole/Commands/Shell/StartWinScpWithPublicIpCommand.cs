using System.Diagnostics;

namespace AWSManageConsole.Commands.Shell;

internal class StartWinScpWithPublicIpCommand : BaseCommand
{
	public StartWinScpWithPublicIpCommand(IServiceProvider serviceProvider) : base(serviceProvider)
	{
	}

	public override string Name => $"[WinScp] Start WinSCP with Public IP";

	public override async Task ExecuteAsync()
	{
		string username = "Enter the username for SFTP connection: (default: ubuntu) ".ReadValue<string>();
		if (string.IsNullOrWhiteSpace(username))
		{
			username = "ubuntu";
		}

		string publicIp = "Enter the Public IP of the EC2 instance: ".ReadValue<string>();
		if (string.IsNullOrWhiteSpace(publicIp))
		{
			"Public IP cannot be empty. Operation cancelled.".WriteError();
			return;
		}

		WinScpConfiguration winScpConfiguration = _configurationService.GetWinScpConfiguration();

		StartWinScpGui(winScpConfiguration.WinScpInstallPath, winScpConfiguration.PrivateKeyPath, publicIp, username);
	}

	public static void StartWinScpGui(string winScpPath, string privateKeyPath, string publicIp, string username)
	{
		// HIER IST DIE KORREKTUR: Entfernung der Leerzeichen um das "="
		string arguments = $"sftp://{username}@{publicIp}/ /privatekey=\"{privateKeyPath}\"";

		// Die ausführbare Datei ist WinSCP.exe
		string fileName = Path.Combine(winScpPath, "winscp.exe");

		ProcessStartInfo processInfo = new(fileName, arguments)
		{
			// Muss auf true gesetzt werden, um die GUI zu starten
			UseShellExecute = true,

			// Wird ignoriert, da UseShellExecute = true, aber kann beibehalten werden
			CreateNoWindow = false
		};

		try
		{
			// Starte den Prozess
			Process.Start(processInfo);
			"WinSCP started successfully.".WriteInfo();
		}
		catch (Exception ex)
		{
			$"Error starting WinSCP: {ex.Message}".WriteError();
		}
	}
}
