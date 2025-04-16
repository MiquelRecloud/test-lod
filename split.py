import open3d as o3d
import numpy as np
import os
import json

def split_pointcloud_by_cubes(input_ply, output_dir, cube_size):
    # Load the point cloud
    pcd = o3d.io.read_point_cloud(input_ply)
    points = np.asarray(pcd.points)

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    cubes = {}
    for point in points:
        cube_index = tuple((point // cube_size).astype(int))

        if cube_index not in cubes:
            cubes[cube_index] = []
        cubes[cube_index].append(point)

    file_names = []

    # Save each cube's points as a separate PLY file
    for cube_index, cube_points in cubes.items():
        cube_position = np.array(cube_index) * cube_size
        local_points = np.array(cube_points) - cube_position

        cube_pcd = o3d.geometry.PointCloud()
        cube_pcd.points = o3d.utility.Vector3dVector(local_points)
        
        cube_filename = f"cube_{cube_index[0]}_{cube_index[1]}_{cube_index[2]}.ply"
        o3d.io.write_point_cloud(os.path.join(output_dir, cube_filename), cube_pcd)
        file_names.append({
            "filename": cube_filename,
            "position": cube_position.tolist()
        })

    # Save the list of file names to a JSON file
    json_filename = os.path.join(output_dir, "list.json")
    with open(json_filename, "w") as json_file:
        json.dump(file_names, json_file)

if __name__ == "__main__":
    input_ply = "public/low.ply"
    output_dir = "public/low"
    cube_size = 2.0

    split_pointcloud_by_cubes(input_ply, output_dir, cube_size)