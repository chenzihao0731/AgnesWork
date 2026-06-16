import React from "react";

type IconProps = {
  className?: string;
  size?: number;
  stroke?: number;
  style?: React.CSSProperties;
};

function makeSvg(
  children: React.ReactNode,
  viewBox = "0 0 24 24",
  fill = "none",
) {
  return function Svg({ className = "w-5 h-5", size, stroke, style }: IconProps) {
    const finalStyle = size ? { width: size, height: size, ...style } : style;
    return (
      <svg
        viewBox={viewBox}
        fill={fill}
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={finalStyle}
        stroke="currentColor"
        strokeWidth={stroke ?? 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    );
  };
}

/** 会话/聊天 */
export const ChatIcon = makeSvg(
  <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z" />,
);

/** 待办清单 */
export const TodoIcon = makeSvg(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="m8 12 2.2 2.2L15 9" />
    <path d="M8 17h8" />
  </>,
);

/** 技能/拼图块 */
export const SkillIcon = makeSvg(
  <>
    <path d="M10 3h4v3a2 2 0 1 1-4 0V3Z" />
    <path d="M18 10h3a2 2 0 1 1-2 2v1a2 2 0 0 1-2 2h-2v-4a2 2 0 0 1 2-2Z" />
    <path d="M10 21h4v-3a2 2 0 1 0-4 0v3Z" />
    <path d="M3 10h3a2 2 0 1 0-2 2v1a2 2 0 0 0 2 2h2v-4a2 2 0 0 0-2-2H3" />
  </>,
);

/** 插件/电源 */
export const PluginIcon = makeSvg(
  <>
    <path d="M10 3h4v6h-4V3Z" />
    <path d="M8 9h8v3a4 4 0 0 1-4 4v3M12 19v1" />
  </>,
);

/** MCP/链接 */
export const LinkIcon = makeSvg(
  <>
    <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </>,
);

/** 发送 */
export const SendIcon = makeSvg(
  <>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
  </>,
);

/** 停止 */
export const StopIcon = makeSvg(<rect x="5" y="5" width="14" height="14" rx="2.5" />);

/** 设置/齿轮 */
export const SettingsIcon = makeSvg(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.7 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </>,
);

/** 新建/加号 */
export const PlusIcon = makeSvg(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);

/** 关闭 */
export const XIcon = makeSvg(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
);

/** 编辑 */
export const EditIcon = makeSvg(
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
  </>,
);

/** 文件 */
export const FileIcon = makeSvg(
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </>,
);

/** 文件夹打开 */
export const FolderOpenIcon = makeSvg(
  <>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2" />
    <path d="M3 9h18l-2 9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2l0-9Z" />
  </>,
);

/** 图片 */
export const ImageIcon = makeSvg(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m21 16-5-5L5 21" />
  </>,
);

/** 视频 */
export const VideoIcon = makeSvg(
  <>
    <rect x="2" y="5" width="14" height="14" rx="2.5" />
    <path d="m22 7-6 5 6 5V7Z" />
  </>,
);

/** 工具 */
export const WrenchIcon = makeSvg(
  <path d="M14.7 6.3a4.2 4.2 0 0 1 5 5L20 11.5l3 3-5 3-3 3 3.5-3.5-3-3-1.8 1.8a4.2 4.2 0 0 1-5-5l6-5 3 3-2.3 2.3Z" />,
);

/** 令牌/硬币 */
export const CoinIcon = makeSvg(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
  </>,
);

/** 上下文/层叠 */
export const StackIcon = makeSvg(
  <>
    <path d="m12 3 9 5-9 5L3 8l9-5Z" />
    <path d="m3 13 9 5 9-5" />
    <path d="m3 17 9 5 9-5" />
  </>,
);

/** 主题切换（月亮） */
export const MoonIcon = makeSvg(
  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
);

/** 主题切换（太阳） */
export const SunIcon = makeSvg(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);

/** 机器人 */
export const RobotIcon = makeSvg(
  <>
    <rect x="4" y="7" width="16" height="12" rx="3" />
    <circle cx="9.5" cy="13" r="1.2" />
    <circle cx="14.5" cy="13" r="1.2" />
    <path d="M12 4v3M7 19v2M17 19v2" />
  </>,
);

/** 连接点 */
export const DotIcon = makeSvg(<circle cx="12" cy="12" r="4" fill="currentColor" />);

/** 空框 */
export const CircleIcon = makeSvg(<circle cx="12" cy="12" r="9" />);

/** 搜索 */
export const SearchIcon = makeSvg(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>,
);

/** 回形针（附件） */
export const PaperclipIcon = makeSvg(
  <path d="M21 11.5 11.5 21a5 5 0 1 1-7-7L15 3.5a3.5 3.5 0 1 1 5 5L9.5 19a2 2 0 1 1-2.8-2.8L15 7.5" />,
);

/** 复选框 */
export const CheckSquareIcon = makeSvg(
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="m8 12 2.5 2.5L16 9" />
  </>,
);

/** 未勾选 */
export const SquareIcon = makeSvg(<rect x="3" y="3" width="18" height="18" rx="3" />);

/** 闪电/快速 */
export const BoltIcon = makeSvg(
  <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" fill="currentColor" />,
);

/** 刷新 */
export const RefreshIcon = makeSvg(
  <>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
    <path d="M3 21v-5h5" />
  </>,
);

/** 帮助 */
export const HelpIcon = makeSvg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.4-2.5 2-2.5 3.5" />
    <path d="M12 17.5h.01" />
  </>,
);

/** 目标（靶心） */
export const TargetIcon = makeSvg(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </>,
);

/** 旗帜 */
export const FlagIcon = makeSvg(
  <>
    <path d="M5 21V3" />
    <path d="M5 4h13l-2 4 2 4H5" />
  </>,
);

/** 火箭 */
export const RocketIcon = makeSvg(
  <>
    <path d="M4.5 16.5c-1.5 1-2 4-2 4s3-.5 4-2" />
    <path d="M14.5 8.5a7 7 0 0 0-6-6l4 4 2 2 4-4s0 4-4 4" />
    <path d="M7 14l3 3" />
    <circle cx="15" cy="9" r="1.5" />
  </>,
);

/** 闪光（六角星） */
export const SparkleIcon = makeSvg(
  <>
    <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" fill="currentColor" />
    <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" fill="currentColor" />
  </>,
);

/** 魔法棒 */
export const WandIcon = makeSvg(
  <>
    <path d="m15 4 5 5" />
    <path d="M17.5 6.5 4 20" />
    <path d="M4 10h3v3H4z" fill="currentColor" />
    <path d="m16 2h2v2h-2z" fill="currentColor" />
    <path d="M13 7h1.8" />
  </>,
);

/** 右向 Chevron */
export const ChevronIcon = makeSvg(<path d="m9 6 6 6-6 6" />);

/** 长箭头（发送） */
export const ArrowRightIcon = makeSvg(
  <>
    <path d="M5 12h14" />
    <path d="m13 5 7 7-7 7" />
  </>,
);

/** 图层 */
export const LayersIcon = makeSvg(
  <>
    <path d="m12 3 9 5-9 5L3 8l9-5Z" />
    <path d="m3 13 9 5 9-5" />
    <path d="m3 17 9 5 9-5" />
  </>,
);

/** 文件夹 */
export const FolderIcon = makeSvg(
  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
);

/** 仪表盘 */
export const GaugeIcon = makeSvg(
  <>
    <path d="M12 14a2 2 0 0 1 2-2l4-4" />
    <path d="M12 22a10 10 0 1 1 10-10" />
  </>,
);

/** 三角播放 */
export const PlayIcon = makeSvg(<path d="m6 4 14 8-14 8V4Z" fill="currentColor" />);

/** 灯泡 */
export const LightbulbIcon = makeSvg(
  <>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3V18h6v-1c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z" />
  </>,
);

/** 复选圈 */
export const CheckCircleIcon = makeSvg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5L16 10" />
  </>,
);

/** 垃圾桶 */
export const TrashIcon = makeSvg(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    <path d="M10 11v6M14 11v6" />
  </>,
);

/** 命令提示符（>_） */
export const CommandIcon = makeSvg(
  <>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="m7 10 3 2-3 2" />
    <path d="M13 15h4" />
  </>,
);

/** 时钟 */
export const ClockIcon = makeSvg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);

/** 滑块/设置 */
export const SlidersIcon = makeSvg(
  <>
    <path d="M4 21v-7" />
    <path d="M4 10V3" />
    <rect x="2" y="10" width="4" height="4" rx="1" />
    <path d="M12 21v-9" />
    <path d="M12 8V3" />
    <rect x="10" y="8" width="4" height="4" rx="1" />
    <path d="M20 21v-5" />
    <path d="M20 12V3" />
    <rect x="18" y="12" width="4" height="4" rx="1" />
  </>,
);

/** 复制 */
export const CopyIcon = makeSvg(
  <>
    <rect x="8" y="8" width="13" height="13" rx="2.5" />
    <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
  </>,
);

/** 关闭 */
export const CloseIcon = makeSvg(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
);

/** 下拉箭头 */
export const ChevronDownIcon = makeSvg(<path d="m6 9 6 6 6-6" />);

/** 眼睛（显示） */
export const EyeIcon = makeSvg(
  <>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

/** 眼睛关闭（隐藏） */
export const EyeOffIcon = makeSvg(
  <>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="m14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <path d="m1 1 22 22" />
  </>,
);
