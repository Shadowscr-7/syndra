import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.60.1.86', username='root', password='49618553Bmb328873.')
stdin, stdout, stderr = ssh.exec_command('cd /opt/syndra && git pull origin dev && docker compose -f docker-compose.prod.yml up -d --build --force-recreate api web 2>&1', timeout=300)
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
