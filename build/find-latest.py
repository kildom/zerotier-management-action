

import os
import re
import sys

def natural_sort(l):
    convert = lambda text: int(text) if text.isdigit() else text.lower()
    alphanumeric_key = lambda key: [convert(c) for c in re.split('([0-9]+)', key[0])]
    return sorted(l, key=alphanumeric_key)

with open(sys.argv[1], 'r') as fd:
    content = fd.read()

arr = []

for m in re.finditer(sys.argv[2], content):
    arr.append((m.group(1), m.group(0)))

if len(arr) == 0:
    print('Match not found', file=sys.stderr)
    exit(1)

arr = natural_sort(arr)

print(arr[-1][1])
