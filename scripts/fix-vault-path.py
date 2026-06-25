import re
p = r'C:\Users\win11\AppData\Local\hermes\.env'
s = open(p, 'r', encoding='utf-8').read()
s = re.sub(r'OBSIDIAN_VAULT_PATH=.*', r'OBSIDIAN_VAULT_PATH=D:\\tools\\Obsidian仓库\\AI仓库', s)
open(p, 'w', encoding='utf-8').write(s)
print('done')
