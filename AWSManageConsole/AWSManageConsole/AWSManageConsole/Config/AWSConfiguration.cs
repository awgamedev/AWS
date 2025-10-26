namespace AWSManageConsole.Config;

public class AWSConfiguration
{
	public AWSConfiguration()
	{
		ProfileName = string.Empty;
		Region = string.Empty;
		DefaultVpcId = string.Empty;
	}

	public string ProfileName { get; set; }
	public string Region { get; set; }
	public string DefaultVpcId { get; set; }

	public bool IsValid()
	{
		return
			!string.IsNullOrEmpty(ProfileName) &&
			!string.IsNullOrEmpty(Region) &&
			!string.IsNullOrEmpty(DefaultVpcId);
	}
}
