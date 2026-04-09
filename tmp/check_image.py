import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.60.1.86', username='root', password='49618553Bmb328873.')
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" "https://syndra.aivanguardlabs.com/uploads/images/ChatGPT_Image_2_mar_2026__02_22_40_1774468535277_3yzgz3.png" 2>&1', timeout=15)
print("Status:", stdout.read().decode())
ssh.close()
