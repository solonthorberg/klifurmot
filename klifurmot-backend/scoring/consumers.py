from channels.generic.websocket import AsyncJsonWebsocketConsumer


class ResultsConsumer(AsyncJsonWebsocketConsumer):
    group_name: str

    async def connect(self):
        url_route = self.scope.get("url_route") or {}
        self.competition_id = url_route.get("kwargs", {}).get("competition_id")

        if not self.competition_id:
            await self.close()
            return

        self.group_name = f"competition_{self.competition_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def score_update(self, event):
        await self.send_json(event["data"])

