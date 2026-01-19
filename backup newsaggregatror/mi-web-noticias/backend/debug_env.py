import os

print("--- RAW ENV READ ---")
try:
    with open(".env", "r") as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            line = line.strip()
            if not line: continue
            if "=" in line:
                key, val = line.split("=", 1)
                masked_val = val[:5] + "..." if len(val) > 5 else "***"
                print(f"Line {i+1}: {key} = {masked_val}")
            else:
                print(f"Line {i+1}: [No '=' found] {line}")
except Exception as e:
    print(f"Error reading .env: {e}")
