namespace AWSManageConsole.Config;

public class AWSConfiguration
{
	public AWSConfiguration()
	{
		ProfileName = string.Empty;
		Region = string.Empty;
	}

	public string ProfileName { get; set; }
	public string Region { get; set; }

	public bool IsValid()
	{
		return
			!string.IsNullOrEmpty(ProfileName) &&
			!string.IsNullOrEmpty(Region);
	}
}
