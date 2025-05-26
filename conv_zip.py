import os
import shutil

def zip_folders(parent_folder, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    for folder_name in os.listdir(parent_folder):
        folder_path = os.path.join(parent_folder, folder_name)
        
        if os.path.isdir(folder_path):
            output_filename = os.path.splitext(folder_name)[0] + ".mcpr"
            output_path = os.path.join(output_folder, output_filename)
            
            shutil.make_archive(output_path, 'zip', folder_path)
            
            os.rename(output_path + ".zip", output_path)

parent_folder = "./run"
output_folder = "./output"
zip_folders(parent_folder, output_folder)