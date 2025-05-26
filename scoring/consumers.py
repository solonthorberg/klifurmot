from channels.generic.websocket import AsyncWebsocketConsumer
import json

class ResultsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.competition_id = self.scope['url_route']['kwargs']['competition_id']
        self.group_name = f"competition_{self.competition_id}"

        print(f"📥 CONNECT WebSocket for group: {self.group_name}")

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        print(f"❌ DISCONNECT from group: {self.group_name}")
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_result_update(self, event):
        print(f"📡 SEND update to WebSocket:", event["data"])
        await self.send(text_data=json.dumps(event["data"]))
