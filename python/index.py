from urllib.parse import urlparse, parse_qs
import websockets
import asyncio
import uuid
import json

connections = {}
users = {}


async def broadcast_users():
    message = json.dumps(users)
    for websocket in connections.values():
        await websocket.send(message)


async def handle_message(message, user_id):
    try:
        data = json.loads(message)
        users[user_id]["state"] = data
        await broadcast_users()
    except json.JSONDecodeError:
        print("Invalid message format")


async def handle_connection(websocket, path):
    query_params = parse_qs(urlparse(path).query)
    username = query_params.get("username", [None])[0]

    if not username:
        await websocket.close(code=1008, reason="Username required")
        return

    user_id = str(uuid.uuid4())
    print(f"{username}-{user_id} connected")

    connections[user_id] = websocket
    users[user_id] = {"username": username, "state": {}}

    try:
        async for message in websocket:
            await handle_message(message, user_id)
    except websockets.ConnectionClosed:
        pass
    finally:
        del connections[user_id]
        del users[user_id]
        await broadcast_users()
        print(f"{username}-{user_id} disconnected")


async def main():
    port = 8000
    async with websockets.serve(handle_connection, "localhost", port):
        print(f"ws://localhost:{port}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
