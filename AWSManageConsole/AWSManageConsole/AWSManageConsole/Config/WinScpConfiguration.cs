namespace AWSManageConsole.Config;

public class WinScpConfiguration
{
	public WinScpConfiguration()
	{
		WinScpInstallPath = string.Empty;
		PrivateKeyPath = string.Empty;
	}

	public string WinScpInstallPath { get; set; }
	public string PrivateKeyPath { get; set; }

	public bool IsValid()
	{
		return
			!string.IsNullOrEmpty(WinScpInstallPath) &&
			!string.IsNullOrEmpty(PrivateKeyPath);
	}
}
