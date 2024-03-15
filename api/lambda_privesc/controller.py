from flask import jsonify
import os
from lib.instance_repo import read_from_desk
from .create import CreateLambdaPriEsc
from .destroy import DestroyLambdaPriEsc
from .attack import AttackLambdaPriEsc
from concurrent.futures import ThreadPoolExecutor
import threading

instance_path = './api/lambda_privesc/instances'

def create(id, profile, aws_region):
    instance = read_from_desk(id,instance_path)
    if instance:
        return {"id": instance['id'], "status": instance['status'], "step":instance['step']}

    create = CreateLambdaPriEsc(id, profile, instance_path)
    create.create()
    return {"id": create.id, "status": create.status, "step": create.step}

def attack(id, profile, aws_region):
    instance = read_from_desk(id,instance_path)
    if instance['status'] == 'attack_finished':
        return {"id": instance['id'], "status": instance['status'], "step":instance['step']}
    
    attack = AttackLambdaPriEsc(id, aws_region, instance, instance_path)
    attack.attack()
    return {"id": attack.id, "status": attack.status, "step": attack.step}

def get_status(id):
    instance = read_from_desk(id,instance_path)
    if instance == None:
        return jsonify({"error": "ID not found"}), 404

    exclude_keys = ['resources']
   
    for key in exclude_keys:
        instance.pop(key, None) 
     
    return instance

def destroy(id, profile, aws_region):
    try:
        instance = read_from_desk(id,instance_path)
        destroy = DestroyLambdaPriEsc(id, profile, instance['resources'], instance['resourcesV2'])

        destroy.destroy()
        filename=f"{instance_path}/{id}.json"
        os.remove(filename)
        
        print(f"File {filename} has been successfully removed.")
    except FileNotFoundError:
        print(f"File {filename} does not exist, cannot remove.")
    except Exception as e:
        print(f"An error occurred: {e}")

    return {"id": destroy.id, "status": destroy.status, "message": destroy.logs}

