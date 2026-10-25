using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace SanaSetup {
    static class Program {
        [STAThread] static int Main(string[] args) {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            try {
                if (args.Length == 2 && args[0] == "--preview") {
                    using (SetupForm form = new SetupForm()) {
                        form.Show(); Application.DoEvents();
                        using (Bitmap image = new Bitmap(form.Width, form.Height)) {
                            form.DrawToBitmap(image, new Rectangle(Point.Empty, image.Size));
                            image.Save(args[1]);
                        }
                        form.Close();
                    }
                    return 0;
                }
                if (args.Length == 1 && args[0] == "--check-package") {
                    string temp = Path.Combine(Path.GetTempPath(), "sana-check-" + Guid.NewGuid());
                    Directory.CreateDirectory(temp);
                    try {
                        string backend = Path.Combine(temp,"SanaBridgeService.exe");
                        Engine.ExtractBackend(backend);
                        Engine.Run(backend,"--self-test",240);
                        Console.WriteLine("PACKAGE_CHECK_PASS");
                    } finally { Directory.Delete(temp,true); }
                    return 0;
                }
                WindowsPrincipal principal = new WindowsPrincipal(WindowsIdentity.GetCurrent());
                if (!principal.IsInRole(WindowsBuiltInRole.Administrator)) {
                    Process.Start(new ProcessStartInfo(Application.ExecutablePath) { UseShellExecute=true, Verb="runas" });
                    return 0;
                }
                Application.Run(new SetupForm());
                return 0;
            } catch (Exception) {
                if (args.Length == 0) MessageBox.Show("راه‌اندازی انجام نشد. دسترسی مدیر سیستم و سلامت فایل را بررسی کنید.","نصب سانا",MessageBoxButtons.OK,MessageBoxIcon.Error,MessageBoxDefaultButton.Button1,MessageBoxOptions.RtlReading|MessageBoxOptions.RightAlign);
                return 1;
            }
        }
    }

    public class SetupForm : Form {
        TextBox crm = new TextBox(), username = new TextBox(), password = new TextBox(), host = new TextBox();
        CheckBox publicSetup = new CheckBox();
        Button install = new Button(), close = new Button();
        Label status = new Label();
        ProgressBar progress = new ProgressBar();
        RichTextBox log = new RichTextBox();
        BackgroundWorker worker = new BackgroundWorker();
        bool busy;
        public SetupForm() {
            Text="نصب سرویس سانا"; Font=new Font("Segoe UI",11); Width=850; Height=730;
            MinimumSize=new Size(850,730); MaximumSize=new Size(1100,850);
            StartPosition=FormStartPosition.CenterScreen; BackColor=Color.White;
            RightToLeft=RightToLeft.Yes; RightToLeftLayout=true; AutoScaleMode=AutoScaleMode.Dpi;
            Label title=new Label { Text="راه‌انداز سانا", Font=new Font("Segoe UI",21,FontStyle.Bold), ForeColor=Color.FromArgb(166,0,27), AutoSize=false, Dock=DockStyle.Top, Height=62, Padding=new Padding(20,12,20,0) };
            Label intro=new Label {Text="بدون نصب جداگانهٔ پایتون و بدون دستورهای فنی\nفقط اطلاعات اتصال را وارد کنید؛ نصب و اجرای خودکار انجام می‌شود.",Dock=DockStyle.Top,Height=66,Padding=new Padding(24,0,24,0)};
            Panel content=new Panel {Dock=DockStyle.Fill,Padding=new Padding(24,12,24,16)};
            TableLayoutPanel fields=new TableLayoutPanel {Dock=DockStyle.Top,Height=216,ColumnCount=2,RowCount=4,RightToLeft=RightToLeft.Yes};
            fields.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,200)); fields.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));
            string[] labels={"آدرس پیام‌گستر","نام کاربری پیام‌گستر","رمز عبور پیام‌گستر","دامنهٔ عمومی (اختیاری)"};
            TextBox[] inputs={crm,username,password,host};
            for(int i=0;i<4;i++) {
                fields.RowStyles.Add(new RowStyle(SizeType.Absolute,54));
                fields.Controls.Add(new Label {Text=labels[i],Dock=DockStyle.Fill,TextAlign=ContentAlignment.MiddleRight},0,i);
                inputs[i].Dock=DockStyle.Fill; inputs[i].Margin=new Padding(8,10,0,10); inputs[i].RightToLeft=RightToLeft.No;
                fields.Controls.Add(inputs[i],1,i);
            }
            password.UseSystemPasswordChar=true;
            Dictionary<string,string> settings=Engine.ReadSettings();
            crm.Text=settings["PAYAMGOSTAR_ENDPOINT"]; username.Text=settings["PAYAMGOSTAR_USERNAME"]; password.Text=settings["PAYAMGOSTAR_PASSWORD"];
            publicSetup.Text="در صورت آماده‌بودن گواهی، مسیر امن عمومی هم در وب‌سرور ساخته شود";
            publicSetup.Checked=true; publicSetup.Dock=DockStyle.Top; publicSetup.Height=46;
            Label privacy=new Label {Text="رمز فقط روی همین سرور ذخیره می‌شود. هیچ رکورد آزمایشی در پیام‌گستر ساخته نمی‌شود.",Dock=DockStyle.Top,Height=54,ForeColor=Color.FromArgb(75,85,95)};
            status.Text="آمادهٔ نصب"; status.Dock=DockStyle.Top; status.Height=36; status.Font=new Font(Font,FontStyle.Bold);
            progress.Dock=DockStyle.Top; progress.Height=10; progress.Style=ProgressBarStyle.Continuous;
            log.Dock=DockStyle.Fill; log.ReadOnly=true; log.BorderStyle=BorderStyle.None; log.BackColor=Color.FromArgb(247,249,250); log.RightToLeft=RightToLeft.Yes; log.Font=new Font("Segoe UI",10);
            Panel footer=new Panel {Dock=DockStyle.Bottom,Height=64,Padding=new Padding(24,12,24,12)};
            install.Text="نصب و راه‌اندازی"; install.Width=210; install.Dock=DockStyle.Right; install.BackColor=Color.FromArgb(166,0,27);install.ForeColor=Color.White;install.FlatStyle=FlatStyle.Flat;
            close.Text="بستن"; close.Width=110; close.Dock=DockStyle.Left;
            close.Click+=delegate {if(!busy) Close();}; install.Click+=Install;
            footer.Controls.Add(install);footer.Controls.Add(close);
            content.Controls.Add(log);content.Controls.Add(progress);content.Controls.Add(status);content.Controls.Add(privacy);content.Controls.Add(publicSetup);content.Controls.Add(fields);
            Controls.Add(content);Controls.Add(footer);Controls.Add(intro);Controls.Add(title);
            FormClosing+=delegate(object sender,FormClosingEventArgs e) {if(busy)e.Cancel=true;};
        }
        void Append(string message) {if(InvokeRequired){BeginInvoke(new Action<string>(Append),message);return;}log.AppendText(message+Environment.NewLine);status.Text=message;}
        void Install(object sender,EventArgs args) {
            Uri endpoint;
            if(!Uri.TryCreate(crm.Text.Trim(),UriKind.Absolute,out endpoint) || (endpoint.Scheme!="http"&&endpoint.Scheme!="https") || endpoint.UserInfo.Length>0 || endpoint.Query.Length>0 || endpoint.Fragment.Length>0) {Append("آدرس پیام‌گستر معتبر نیست.");return;}
            if(string.IsNullOrWhiteSpace(username.Text)||string.IsNullOrWhiteSpace(password.Text)){Append("نام کاربری و رمز عبور را کامل کنید.");return;}
            string hostname=host.Text.Trim();
            if(hostname.Length>0 && Uri.CheckHostName(hostname)!=UriHostNameType.Dns){Append("دامنه را بدون پیشوند، مسیر و شمارهٔ پورت وارد کنید.");return;}
            Dictionary<string,string> settings=Engine.ReadSettings();
            string url=endpoint.GetLeftPart(UriPartial.Path).TrimEnd('/');
            if(endpoint.AbsolutePath=="/")url+="/Services/API/IForm.svc";
            if(!new Uri(url).AbsolutePath.Equals("/Services/API/IForm.svc",StringComparison.OrdinalIgnoreCase)){Append("آدرس باید به سرویس فرم پیام‌گستر اشاره کند.");return;}
            settings["PAYAMGOSTAR_ENDPOINT"]=url;settings["PAYAMGOSTAR_WSDL_URL"]=url+"?wsdl";
            settings["PAYAMGOSTAR_USERNAME"]=username.Text;settings["PAYAMGOSTAR_PASSWORD"]=password.Text;
            settings["PAYAMGOSTAR_ALLOW_HTTP"]=endpoint.Scheme=="http"?"true":"false";
            busy=true; install.Enabled=false;close.Enabled=false;crm.Enabled=username.Enabled=password.Enabled=host.Enabled=publicSetup.Enabled=false;
            progress.Style=ProgressBarStyle.Marquee;
            bool configurePublic=publicSetup.Checked;
            worker.DoWork+=delegate {Engine.Install(settings,hostname,configurePublic,Append);};
            worker.RunWorkerCompleted+=delegate(object s,RunWorkerCompletedEventArgs e) {
                busy=false;close.Enabled=true;progress.Style=ProgressBarStyle.Continuous;
                if(e.Error!=null){Append("نصب کامل نشد؛ "+Engine.FriendlyFailure);install.Enabled=true;crm.Enabled=username.Enabled=password.Enabled=host.Enabled=publicSetup.Enabled=true;}
                else {progress.Value=100;install.Text="نصب انجام شد";Append("نصب داخلی تکمیل شد. سایت اصلی هنوز تغییر نکرده است.");}
                // A failed attempt may be corrected and retried without duplicating handlers.
                worker.Dispose();worker=new BackgroundWorker();
            };
            worker.RunWorkerAsync();
        }
    }

    static class Engine {
        internal static readonly string Root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),"SANADeviceBridge");
        static readonly string Private=Path.Combine(Root,"private"), AppDir=Path.Combine(Root,"app"), Data=Path.Combine(Root,"data");
        static readonly string Config=Path.Combine(Private,"server-env.json"), Backend=Path.Combine(AppDir,"SanaBridgeService.exe");
        static readonly string Contract=Path.Combine(Private,"form-contract.json");
        const string TaskName="SANADeviceBridge";
        internal static string FriendlyFailure="فایل تنظیمات و دسترسی مدیر سیستم را بررسی کنید.";
        static JavaScriptSerializer json=new JavaScriptSerializer();
        static string Quote(string text){return "\""+text+"\"";}
        static string PS(string text){return "'"+text.Replace("'","''")+"'";}
        static string ResourceText(string name){using(Stream stream=Assembly.GetExecutingAssembly().GetManifestResourceStream(name))using(StreamReader reader=new StreamReader(stream,Encoding.UTF8))return reader.ReadToEnd();}
        internal static Dictionary<string,string> ReadSettings() {
            Dictionary<string,string> defaults=json.Deserialize<Dictionary<string,string>>(ResourceText("settings.json"));
            if(File.Exists(Config))foreach(KeyValuePair<string,string> item in json.Deserialize<Dictionary<string,string>>(File.ReadAllText(Config,Encoding.UTF8)))if(defaults.ContainsKey(item.Key))defaults[item.Key]=item.Value;
            return defaults;
        }
        static void SecureDirectory(string path) {
            Directory.CreateDirectory(path);
            DirectorySecurity acl=new DirectorySecurity();acl.SetAccessRuleProtection(true,false);
            foreach(string sid in new[]{"S-1-5-32-544","S-1-5-18"})acl.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(sid),FileSystemRights.FullControl,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));
            Directory.SetAccessControl(path,acl);
        }
        internal static void ExtractBackend(string filename) {
            using(Stream source=Assembly.GetExecutingAssembly().GetManifestResourceStream("backend.exe"))using(FileStream target=File.Create(filename))source.CopyTo(target);
            string digest;
            using(SHA256 sha=SHA256.Create())using(FileStream stream=File.OpenRead(filename))digest=BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","").ToLowerInvariant();
            if(digest!=BuildInfo.BackendSha256)throw new InvalidDataException("Package integrity mismatch");
        }
        internal static void Run(string exe,string arguments,int timeout) {
            ProcessStartInfo info=new ProcessStartInfo(exe,arguments){UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true};
            using(Process process=new Process {StartInfo=info}) {
                // Drain output without writing credentials or raw remote exceptions to disk/UI.
                process.OutputDataReceived+=delegate{};process.ErrorDataReceived+=delegate{};
                process.Start();process.BeginOutputReadLine();process.BeginErrorReadLine();
                if(!process.WaitForExit(timeout*1000)){try{process.Kill();}catch{}throw new TimeoutException();}
                process.WaitForExit();if(process.ExitCode!=0)throw new InvalidOperationException("Installation step failed");
            }
        }
        static void PowerShell(string script,int timeout) {
            string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes("$ErrorActionPreference='Stop'; "+script));
            Run(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"WindowsPowerShell\\v1.0\\powershell.exe"),"-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand "+encoded,timeout);
        }
        static void BackendCommand(string executable,string config,string command,int timeout){Run(executable,"--env-file "+Quote(config)+" "+command,timeout);}
        static void Save(string filename,Dictionary<string,string> settings){File.WriteAllText(filename,json.Serialize(settings),new UTF8Encoding(false));}
        static void CopyIfExists(string source,string target){if(File.Exists(source))File.Copy(source,target,true);}
        internal static void Install(Dictionary<string,string> settings,string host,bool publicSetup,Action<string> progress) {
            string legacy=Path.Combine(Path.GetPathRoot(Environment.SystemDirectory),"SanaCrmBridge\\data\\outbox.sqlite");
            if(!File.Exists(Path.Combine(Data,"outbox.sqlite")) && (File.Exists(legacy)||File.Exists(legacy+".instance"))) {
                FriendlyFailure="دیتابیس نسخهٔ قبلی پیدا شد. برای حفظ شمارنده، انتقال آن باید بررسی شود.";
                throw new InvalidOperationException("Legacy database requires safe migration");
            }
            SecureDirectory(Root);SecureDirectory(Private);SecureDirectory(Data);SecureDirectory(AppDir);
            string stage=Path.Combine(Private,"stage-"+Guid.NewGuid().ToString("N"));SecureDirectory(stage);
            string candidate=Path.Combine(stage,"SanaBridgeService.exe"), candidateConfig=Path.Combine(stage,"server-env.json"), candidateContract=Path.Combine(stage,"form-contract.json");
            bool stopped=false, changed=false;
            try {
                FriendlyFailure="فایل نصب سالم نیست یا اجازهٔ نوشتن روی دیسک وجود ندارد.";
                progress("در حال آماده‌سازی برنامه و وابستگی‌ها…");ExtractBackend(candidate);Run(candidate,"--self-test",240);
                settings["SANA_DB_PATH"]=Path.Combine(Data,"outbox.sqlite");settings["SANA_BIND"]="127.0.0.1";settings["PORT"]="8081";settings["PAYAMGOSTAR_CONTRACT_FILE"]=candidateContract;
                Save(candidateConfig,settings);
                FriendlyFailure="دریافت قرارداد پیام‌گستر ممکن نشد. آدرس آن باید از داخل همین سرور قابل دسترسی باشد.";
                progress("در حال بررسی قرارداد؛ بدون ثبت رکورد آزمایشی…");
                if(File.Exists(Contract))File.Copy(Contract,candidateContract);else BackendCommand(candidate,candidateConfig,"prepare-contract",240);
                BackendCommand(candidate,candidateConfig,"check-contract",240);
                FriendlyFailure="نام کاربری، رمز عبور یا مجوز خواندن فرم در پیام‌گستر تأیید نشد.";
                progress("در حال بررسی ورود و مجوز خواندن؛ بدون ساخت رکورد…");
                BackendCommand(candidate,candidateConfig,"--check-read-access",240);
                CopyIfExists(Backend,Path.Combine(stage,"previous.exe"));CopyIfExists(Config,Path.Combine(stage,"previous.json"));CopyIfExists(Contract,Path.Combine(stage,"previous-contract.json"));
                FriendlyFailure="نسخهٔ قبلی سرویس هنوز باز است یا پورت داخلی اشغال شده است.";
                progress("در حال تنظیم اجرای دائمی سرویس…");
                PowerShell("$t=Get-ScheduledTask -TaskName "+PS(TaskName)+" -ErrorAction SilentlyContinue; if($t){if($t.Actions.Count -ne 1 -or $t.Actions[0].Execute -ne "+PS(Backend)+"){throw 'Task name collision'}; Stop-ScheduledTask -TaskName "+PS(TaskName)+"}",30);
                stopped=true;
                bool free=false;for(int i=0;i<30;i++){try{TcpListener test=new TcpListener(IPAddress.Loopback,8081);test.Start();test.Stop();free=true;break;}catch(SocketException){Thread.Sleep(500);}}
                if(!free)throw new InvalidOperationException("Port busy");
                settings["PAYAMGOSTAR_CONTRACT_FILE"]=Contract;
                changed=true;
                // Recreate owned files under protected directories; do not preserve an old permissive file ACL.
                if(File.Exists(Backend))File.Delete(Backend);File.Copy(candidate,Backend);
                if(File.Exists(Config))File.Delete(Config);Save(Config,settings);
                if(File.Exists(Contract))File.Delete(Contract);File.Copy(candidateContract,Contract);
                FriendlyFailure="ذخیره‌سازی دائمی آماده نیست. دیتابیس یا شمارنده را حذف نکنید.";
                BackendCommand(Backend,Config,"--ensure-store",60);
                FriendlyFailure="ثبت اجرای خودکار انجام نشد. دسترسی مدیر سیستم و زمان‌بند ویندوز را بررسی کنید.";
                string action="--env-file "+Quote(Config)+" serve";
                PowerShell("$a=New-ScheduledTaskAction -Execute "+PS(Backend)+" -Argument "+PS(action)+" -WorkingDirectory "+PS(AppDir)+"; $t=New-ScheduledTaskTrigger -AtStartup; $t.Delay='PT30S'; $s=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero); $p=New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest; Register-ScheduledTask -TaskName "+PS(TaskName)+" -Action $a -Trigger $t -Settings $s -Principal $p -Force | Out-Null; Start-ScheduledTask -TaskName "+PS(TaskName),45);
                FriendlyFailure="سرویس داخلی پاسخ نداد. برنامه و دیتابیس حفظ شده‌اند؛ تنظیمات باید بررسی شوند.";
                bool healthy=false;for(int i=0;i<45;i++){try{HttpWebRequest req=(HttpWebRequest)WebRequest.Create("http://127.0.0.1:8081/healthz");req.Timeout=2000;using(WebResponse response=req.GetResponse())using(StreamReader reader=new StreamReader(response.GetResponseStream())){if(reader.ReadToEnd().Contains("ready")){healthy=true;break;}}}catch{}Thread.Sleep(1000);}
                if(!healthy)throw new InvalidOperationException("Health not ready");
                progress("برنامه، دیتابیس دائمی و اجرای خودکار آماده شدند.");
                progress("ورود و خواندن بررسی شد؛ هیچ رکورد آزمایشی ثبت نشد.");
                if(publicSetup && host.Length>0) {
                    try { ConfigurePublic(host);progress("سایت امن جداگانه در وب‌سرور ساخته شد.");progress("دامنه و دسترسی بیرون شرکت هنوز باید بررسی شوند."); }
                    catch {progress("نصب داخلی موفق است؛ برای مسیر عمومی، گواهی یا ماژول‌های وب‌سرور آماده نیستند.");progress("دامنه و تنظیم شبکه باید توسط مسئول شبکه تکمیل شوند.");}
                } else progress("برای اتصال سایت، یک دامنهٔ امن عمومی لازم است؛ نصب داخلی کافی نیست.");
            } catch {
                if(changed) {
                    try {PowerShell("Stop-ScheduledTask -TaskName "+PS(TaskName)+" -ErrorAction SilentlyContinue",15);}catch{}
                    try {CopyIfExists(Path.Combine(stage,"previous.exe"),Backend);CopyIfExists(Path.Combine(stage,"previous.json"),Config);CopyIfExists(Path.Combine(stage,"previous-contract.json"),Contract);}catch{}
                }
                if(stopped && File.Exists(Path.Combine(stage,"previous.exe")))try{PowerShell("Start-ScheduledTask -TaskName "+PS(TaskName),15);}catch{}
                throw;
            } finally {try {Directory.Delete(stage,true);}catch{}}
        }
        static void ConfigurePublic(string host) {
            string proxy=Path.Combine(Root,"proxy");SecureDirectory(proxy);
            SecurityIdentifier iis=new SecurityIdentifier("S-1-5-32-568");
            DirectorySecurity rootAcl=Directory.GetAccessControl(Root);rootAcl.AddAccessRule(new FileSystemAccessRule(iis,FileSystemRights.ReadAndExecute,AccessControlType.Allow));Directory.SetAccessControl(Root,rootAcl);
            DirectorySecurity proxyAcl=Directory.GetAccessControl(proxy);proxyAcl.AddAccessRule(new FileSystemAccessRule(iis,FileSystemRights.ReadAndExecute,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));Directory.SetAccessControl(proxy,proxyAcl);
            string xml="<?xml version=\"1.0\" encoding=\"utf-8\"?><configuration><system.webServer><rewrite><rules><rule name=\"SanaBridgeProxy\" stopProcessing=\"true\"><match url=\"^(api/leads|healthz)$\"/><action type=\"Rewrite\" url=\"http://127.0.0.1:8081/{R:1}\"/></rule></rules></rewrite></system.webServer></configuration>";
            File.WriteAllText(Path.Combine(proxy,"web.config"),xml,new UTF8Encoding(false));
            string script="Import-Module WebAdministration; if(!(Get-WebGlobalModule | Where-Object {$_.Name -eq 'RewriteModule'})){throw 'Rewrite missing'}; $proxy=Get-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter 'system.webServer/proxy' -Name enabled; if(!$proxy.Value){throw 'ARR proxy not enabled'}; $cert=Get-ChildItem Cert:\\LocalMachine\\My | Where-Object {$_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) -and $_.NotBefore -lt (Get-Date) -and (@($_.DnsNameList | Where-Object {"+PS(host)+" -like $_.Unicode}).Count -gt 0)} | Sort-Object NotAfter -Descending | Select-Object -First 1; if(!$cert){throw 'Certificate missing'}; $name='SANA Device Bridge HTTPS'; foreach($w in Get-Website){if($w.Name -ne $name){foreach($b in Get-WebBinding -Name $w.Name -Protocol https){if($b.bindingInformation -like ('*:443:'+"+PS(host)+")){throw 'Host binding already belongs to another site'}}}}; $site=Get-Website -Name $name -ErrorAction SilentlyContinue; if($site){if([string]$site.physicalPath -ne "+PS(proxy)+"){throw 'Site collision'}}else{New-Website -Name $name -PhysicalPath "+PS(proxy)+" -Port 443 -HostHeader "+PS(host)+" -Ssl | Out-Null}; Set-WebBinding -Name $name -BindingInformation ('*:443:'+"+PS(host)+") -PropertyName sslFlags -Value 1; $binding=Get-WebBinding -Name $name -Protocol https | Where-Object {$_.bindingInformation -eq ('*:443:'+"+PS(host)+")}; if(!$binding){throw 'Unexpected binding'}; $binding.AddSslCertificate($cert.Thumbprint,'My')";
            PowerShell(script,45);
        }
    }
}
