namespace AWSManageConsole.Config;

internal class Configuration
{
	public Configuration()
	{
		AWSConfiguration = new AWSConfiguration();
	}

	public AWSConfiguration AWSConfiguration { get; set; }

	public bool IsValid()
	{
		return AWSConfiguration.IsValid();
	}
}
