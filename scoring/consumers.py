from channels.generic.websocket import AsyncJsonWebsocketConsumer

class ResultsConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.competition_id = self.scope["url_route"]["kwargs"]["competition_id"]
        self.group_name = f"competition_{self.competition_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_result_update(self, event):
        await self.send_json(event["data"])
