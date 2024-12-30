import gzip
import os

def read_log_file(file_path):
    """Reads entries from a log file (handles both regular and gzipped files)."""
    log_entries = []
    try:
        if file_path.endswith('.gz'):
            # Open gzipped log file
            with gzip.open(file_path, 'rt') as file:
                log_entries.extend(file.readlines())
        else:
            # Open regular log file
            with open(file_path, 'r') as file:
                log_entries.extend(file.readlines())
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

    return log_entries

def main():
    log_directory = 'logs'  # Directory where your log files are stored
    output_file = 'filtered_logs.txt'
    log_files = []

    # Collect all relevant log files
    for file in os.listdir(log_directory):
        if file == 'access_log' or file.startswith('access_log-') and file.endswith('.gz'):
            log_files.append(os.path.join(log_directory, file))

    all_log_entries = []

    # Read all log files into a list
    for log_file in log_files:
        all_log_entries.extend(read_log_file(log_file))

    print(f"Total log entries loaded: {len(all_log_entries)}")

    messenger_log_entries = [entry for entry in all_log_entries if "GET /messenger/ " in entry]
    non_monitoring_log_entries = [entry for entry in messenger_log_entries if "synthetic-monitoring-agent" not in entry]

    filtered_log_entries = non_monitoring_log_entries

    try:
        with open(output_file, 'w') as file:
            file.writelines(filtered_log_entries)
        print(f"Filtered log entries written to {output_file}")
    except Exception as e:
        print(f"Error writing to file {output_file}: {e}")

    print(f"Total filtered log entries: {len(filtered_log_entries)}")

    # Optionally, can return or process all_log_entries here
    return filtered_log_entries

if __name__ == '__main__':
    log_entries = main()