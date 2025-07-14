#!/usr/bin/env python3
import asyncio
import json
from httpx import AsyncClient


async def get_characters(uid: str):
    try:
        async with AsyncClient() as client:
            response = await client.get(f"http://api.mihomo.me/sr_info_parsed/{uid}")
            
            if response.status_code == 200:
                data = response.json()
                print(data.get('player'))
            else:
                print(f"获取失败: {response.status_code}")
                
    except Exception as e:
        print(f"错误: {e}")


async def main():
    uid = input("请输入UID: ").strip()
    if uid:
        await get_characters(uid)


if __name__ == "__main__":
    asyncio.run(main()) 