#!/usr/bin/env python3
"""
FreeAI2API Python 客户端示例

使用示例:
    python examples/python_client.py
    python examples/python_client.py --interactive
"""

import requests
import json
import time
import argparse
from typing import Dict, Any, Optional


class FreeAI2APIClient:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'freeai2api-python-client/1.0'
        })

    def health(self) -> Dict[str, Any]:
        """健康检查"""
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()

    def generate_image(self, prompt: str, **options) -> Dict[str, Any]:
        """异步生成图片"""
        payload = {
            'prompt': prompt,
            'width': options.get('width', 512),
            'height': options.get('height', 512),
            'batch_size': options.get('batch_size', 1),
            'negative_prompt': options.get('negative_prompt', '模糊，变形，畸形')
        }
        
        response = self.session.post(
            f"{self.base_url}/api/generate",
            json=payload
        )
        response.raise_for_status()
        return response.json()

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """查询任务状态"""
        response = self.session.get(f"{self.base_url}/api/task/{task_id}")
        response.raise_for_status()
        return response.json()

    def generate_image_sync(self, prompt: str, **options) -> Dict[str, Any]:
        """同步生成图片"""
        payload = {
            'prompt': prompt,
            'width': options.get('width', 512),
            'height': options.get('height', 512),
            'batch_size': options.get('batch_size', 1),
            'negative_prompt': options.get('negative_prompt', '模糊，变形，畸形')
        }
        
        response = self.session.post(
            f"{self.base_url}/api/generate-sync",
            json=payload
        )
        response.raise_for_status()
        return response.json()

    def wait_for_completion(self, task_id: str, max_attempts: int = 300, interval: int = 2) -> Dict[str, Any]:
        """等待任务完成"""
        for attempt in range(max_attempts):
            status = self.get_task_status(task_id)
            
            if status.get('success') and status['data'].get('status') == 'completed':
                return status['data']
            
            if status.get('success') and status['data'].get('status') == 'failed':
                raise Exception('Task failed')
            
            print(f"\r尝试 {attempt + 1}/{max_attempts} - 任务状态: {status['data'].get('status', 'unknown')}", end="")
            time.sleep(interval)
        
        raise Exception('Task timeout')


def run_examples():
    """运行示例"""
    print("🚀 FreeAI2API Python 客户端示例")
    print("=" * 50)
    
    client = FreeAI2APIClient()
    
    try:
        # 1. 健康检查
        print("\n1. 检查服务器状态...")
        health = client.health()
        print(f"✅ 服务器状态: {health['data']['status']}")
        
        # 2. 异步生成示例
        print("\n2. 异步生成图片示例...")
        async_result = client.generate_image(
            "A beautiful landscape with mountains and lakes",
            width=512, height=512, batch_size=2
        )
        print("✅ 任务创建成功:")
        print(f"   任务ID: {async_result['data']['task_id']}")
        print(f"   状态: {async_result['data']['status']}")
        
        # 3. 等待任务完成
        print("\n3. 等待任务完成...")
        completed_task = client.wait_for_completion(async_result['data']['task_id'])
        print(f"\n✅ 任务完成:")
        print(f"   图片数量: {len(completed_task['images'])}")
        print("   图片链接:")
        for i, url in enumerate(completed_task['images'][:2]):
            print(f"   {i + 1}. {url}")
        
        # 4. 同步生成示例
        print("\n4. 同步生成图片示例...")
        sync_result = client.generate_image_sync(
            "A futuristic city with flying cars",
            width=768, height=768, batch_size=1
        )
        print(f"✅ 同步生成完成:")
        print(f"   图片数量: {len(sync_result['data']['images'])}")
        print(f"   图片链接: {sync_result['data']['images'][0]}")
        
        print("\n🎉 所有示例运行完成！")
        
    except Exception as error:
        print(f"\n❌ 示例运行失败: {error}")


def interactive_test():
    """交互式测试"""
    print("\n🎆 交互式测试模式")
    print("输入提示词生成图片，输入 'quit' 退出")
    
    client = FreeAI2APIClient()
    
    while True:
        try:
            prompt = input("请输入提示词: ").strip()
            
            if prompt.lower() == 'quit':
                print("👋 再见！")
                break
            
            if not prompt:
                print("⚠️ 请输入有效的提示词")
                continue
            
            print("🚀 开始生成...")
            result = client.generate_image_sync(prompt)
            
            if result.get('success') and result['data'].get('images'):
                print("✅ 生成成功！")
                print(f"   提示词: {result['data']['prompt']}")
                print("   图片链接:")
                for i, url in enumerate(result['data']['images'], 1):
                    print(f"   {i}. {url}")
            else:
                print("⚠️ 生成失败或未返回图片")
                
        except KeyboardInterrupt:
            print("\n👋 再见！")
            break
        except Exception as error:
            print(f"\n❌ 生成失败: {error}")


def main():
    parser = argparse.ArgumentParser(description='FreeAI2API Python 客户端')
    parser.add_argument('--interactive', '-i', action='store_true',
                       help='交互式测试模式')
    parser.add_argument('--url', default='http://localhost:8000',
                       help='API 服务器地址')
    
    args = parser.parse_args()
    
    # 设置客户端 URL
    global client
    client = FreeAI2APIClient(args.url)
    
    if args.interactive:
        interactive_test()
    else:
        run_examples()


if __name__ == '__main__':
    main()