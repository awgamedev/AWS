namespace AWSManageConsole.Config;

public class AWSConfiguration
{
	public AWSConfiguration()
	{
		Region = string.Empty;
	}

	public string Region { get; set; }

	public bool IsValid()
	{
		return !string.IsNullOrEmpty(Region);
	}
}
