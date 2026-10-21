"""更新公开行程：Python 3.10+，仅使用标准库，无需 pip 安装。"""
from pathlib import Path
import json
import sys

# ==================== 用户配置区 ====================
# 后续修改日期、时间、景点：编辑旁边的 itinerary.json，再运行本脚本。
INPUT_JSON = Path(__file__).resolve().parent / 'itinerary.json'
PROJECT_DIR = (Path(__file__).resolve().parent if (Path(__file__).resolve().parent / 'src').is_dir()
               else Path(__file__).resolve().parent.parent / 'work' / 'converted' / 'singapore-trip-explorer')
OUTPUT_JS = PROJECT_DIR / 'src' / 'data.js'
OUTPUT_GUIDE = Path(__file__).resolve().parent / '新加坡行程安排.md'
# 住宿只能填写区域；不要在 JSON 填写酒店名、住宅地址、订单或精确住宿坐标。
# ====================================================

def main():
    if not INPUT_JSON.is_file():
        raise FileNotFoundError(f'找不到行程文件：{INPUT_JSON}')
    if INPUT_JSON.suffix.lower() != '.json':
        raise ValueError('输入必须为 JSON 文件')
    if not (PROJECT_DIR / 'src').is_dir():
        raise FileNotFoundError(f'找不到项目 src 文件夹，请修改 PROJECT_DIR：{PROJECT_DIR}')
    data = json.loads(INPUT_JSON.read_text(encoding='utf-8-sig'))
    if not data.get('days'):
        raise ValueError('days 中至少需要一天行程')
    ids = set()
    for day in data['days']:
        if day['id'] in ids:
            raise ValueError(f"日期重复：{day['id']}")
        ids.add(day['id'])
        if not day.get('places'):
            raise ValueError(f"{day['id']} 缺少行程条目")
        for place in day['places']:
            if place['type'] == 'stay':
                if set(place) - {'type', 'time', 'zh', 'name', 'area', 'desc', 'region'}:
                    raise ValueError('住宿条目仅允许区域文字和 region，不允许地址、坐标或导航字段')
                if place.get('region') and place['region'] not in data['regions']:
                    raise ValueError('住宿区域不存在')
            else:
                if place['type'] not in {'spot', 'mall', 'transport'}:
                    raise ValueError('本行程只接受景点、商场、交通和区域住宿')
                if not (-90 <= place['lat'] <= 90 and -180 <= place['lng'] <= 180):
                    raise ValueError('地点经纬度超出范围')
                if place.get('official') and not place['official'].startswith('https://'):
                    raise ValueError('官网链接必须使用 HTTPS')
    text = '// 自动生成；修改 itinerary.json 后运行 update_itinerary.py。\n'
    text += 'export const tripMeta = ' + json.dumps(data['meta'], ensure_ascii=False, indent=2) + ';\n'
    text += 'export const stayRegions = ' + json.dumps(data['regions'], ensure_ascii=False, indent=2) + ';\n'
    text += 'export const tripDays = ' + json.dumps(data['days'], ensure_ascii=False, indent=2) + ';\n'
    OUTPUT_JS.write_text(text, encoding='utf-8')
    lines = ['# 新加坡行程安排', '', data['meta']['dates'], '',
             '所有时间为当地时间；除机票计划时刻外，均为建议时间，不是预约。',
             '住宿仅显示区域；地图圈为粗略区域示意，不代表住宿位置。', '']
    for day in data['days']:
        lines += [f"## {day['shortDate']} {day['weekday']} · {day['title']}", '', day['note'], '',
                  f"住宿：{day['stay']}", '']
        for place in day['places']:
            lines.append(f"- {place['time']}｜{place['zh']}：{place['desc']}")
            if place.get('official'):
                lines.append(f"  [官网与票务]({place['official']})")
        lines.append('')
    lines += ['## 出发前复核', '',
              '环球影城需选 12 月 12 日门票；开闭园时刻以当日官方日历为准。',
              '云雾林和花穹需核对联票、展览和维护安排。擎天树灯光秀的常规时刻为 19:45 / 20:45；圣诞活动期间入场规则可能不同。',
              '12 月 14–16 日酒店未定；选定后仅调整交通与换住缓冲，不公开酒店名称或坐标。',
              '不安排餐馆；午餐、晚餐与休息时间自行保留。不加入远郊动物园、东海岸、登布西等额外行程。',
              '12 月 17–22 日仅显示区域住宿，不安排景点或返程机场活动。']
    OUTPUT_GUIDE.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'更新成功，共 {len(data["days"])} 天。\n网页数据：{OUTPUT_JS.resolve()}\n行程说明：{OUTPUT_GUIDE.resolve()}')
    print('本脚本只更新本地文件。发布请在项目目录执行 npm run build，检查后提交并推送 GitHub。')

if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f'更新失败：{exc}', file=sys.stderr)
        sys.exit(1)
