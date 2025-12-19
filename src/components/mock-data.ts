// Mock data for restaurant, attraction, and transport details

export const getMockRestaurantData = (name: string) => {
  const restaurants: Record<string, any> = {
    'Dishoom': {
      name: 'Dishoom 餐厅',
      nameEn: 'Dishoom',
      address: '12 Upper St Martin\'s Lane, London WC2H 9FB',
      hours: '周一至周日 8:00-23:00',
      cuisine: '印度风味料理',
      priceRange: '£20-30',
      signature: [
        {
          name: '黑达尔咖喱',
          nameEn: 'Black Daal',
          description: '慢煮24小时的黑扁豆，香浓顺滑，是餐厅必点招牌菜',
          image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBmb29kJTIwY3Vycnl8ZW58MXx8fHwxNzY0ODc2MDIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
          allergens: ['乳制品', '黄油']
        },
        {
          name: '羊肉卷饼',
          nameEn: 'Lamb Raan Roll',
          description: '慢烤羊腿肉配新鲜薄饼，口感嫩滑多汁',
          image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBmb29kJTIwY3Vycnl8ZW58MXx8fHwxNzY0ODc2MDIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
          allergens: ['面筋', '芝麻']
        },
        {
          name: '印度奶茶',
          nameEn: 'Masala Chai',
          description: '传统香料奶茶，搭配任何菜品都很完美',
          image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBmb29kJTIwY3Vycnl8ZW58MXx8fHwxNzY0ODc2MDIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
          allergens: ['乳制品']
        }
      ],
      menuImage: 'https://images.unsplash.com/photo-1743811929027-f6864cc6fe1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwbWVudSUyMGJvYXJkfGVufDF8fHx8MTc2NDk1MjE0N3ww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Gordon Ramsay Bar & Grill': {
      name: 'Gordon Ramsay 牛排馆',
      nameEn: 'Gordon Ramsay Bar & Grill',
      address: '10-11 Heddon St, London W1B 4BX',
      hours: '周一至周日 12:00-22:30',
      cuisine: '英式牛排',
      priceRange: '£50-80',
      signature: [
        {
          name: '战斧牛排',
          nameEn: 'Tomahawk Steak',
          description: '1.2kg大份量战斧牛排，适合2-3人分享',
          image: 'https://images.unsplash.com/photo-1695924274007-82018762e6bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicml0aXNoJTIwc3RlYWslMjByZXN0YXVyYW50fGVufDF8fHx8MTc2NDk1MjE0N3ww&ixlib=rb-4.1.0&q=80&w=1080',
          allergens: []
        },
        {
          name: '惠灵顿牛排',
          nameEn: 'Beef Wellington',
          description: '戈登·拉姆齐招牌菜，完美的酥皮包裹嫩牛肉',
          image: 'https://images.unsplash.com/photo-1695924274007-82018762e6bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicml0aXNoJTIwc3RlYWslMjByZXN0YXVyYW50fGVufDF8fHx8MTc2NDk1MjE0N3ww&ixlib=rb-4.1.0&q=80&w=1080',
          allergens: ['面筋', '鸡蛋']
        }
      ],
      menuImage: 'https://images.unsplash.com/photo-1743811929027-f6864cc6fe1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwbWVudSUyMGJvYXJkfGVufDF8fHx8MTc2NDk1MjE0N3ww&ixlib=rb-4.1.0&q=80&w=1080'
    }
  };

  return restaurants[name] || null;
};

export const getMockTransportData = (from: string, to: string) => {
  return {
    from,
    to,
    subway: {
      line: 'Piccadilly Line',
      stations: ['Heathrow Terminal 5', 'Heathrow Terminal 4', 'Hatton Cross', 'Hounslow West', 'Osterley', 'Boston Manor', 'Northfields', 'South Ealing', 'Acton Town', 'Hammersmith', 'Barons Court', 'Earl\'s Court', 'Gloucester Road', 'South Kensington', 'Knightsbridge', 'Hyde Park Corner', 'Green Park', 'Piccadilly Circus', 'Leicester Square', 'Covent Garden', 'Holborn', 'Russell Square', 'King\'s Cross St Pancras'],
      duration: '约50分钟',
      price: '£5.50 (非高峰期) / £6.60 (高峰期)',
      ticketGuide: [
        '在地铁站售票机购买Oyster卡或单程票',
        '可使用无接触银行卡（Contactless）直接刷卡进站',
        '购买Day Travelcard可全天无限次搭乘'
      ],
      alipayGuide: [
        '打开支付宝APP，搜索"伦敦交通"或"TfL"',
        '点击"乘车码"功能，选择伦敦地铁',
        '生成二维码后直接在闸机扫码进站',
        '出站时再次扫码，自动从支付宝扣款',
        '提示：首次使用需要绑定支付方式，建议提前设置'
      ]
    },
    taxi: {
      estimatedPrice: '£45-65',
      duration: '约45分钟（非高峰期）',
      paymentMethods: ['现金', '信用卡', '支付宝', '微信支付', 'Apple Pay'],
      apps: [
        {
          name: 'Uber',
          description: '国际打车软件，价格透明，支持支付宝支付。建议提前下载注册。',
          supportsAlipay: true
        },
        {
          name: '高德地图（国际版）',
          description: '中文界面友好，直接支持支付宝付款，推荐中国游客使用。',
          supportsAlipay: true
        },
        {
          name: 'Bolt',
          description: '欧洲流行打车软件，价格通常比Uber略低。',
          supportsAlipay: false
        }
      ]
    }
  };
};

export const getMockAttractionData = (name: string) => {
  const attractions: Record<string, any> = {
    '大英博物馆': {
      name: '大英博物馆',
      nameEn: 'The British Museum',
      address: 'Great Russell St, London WC1B 3DG',
      hours: '每天 10:00-17:30（周五延长至20:30）',
      ticketPrice: '免费入场（特展需另购票）',
      description: '世界上历史最悠久、规模最宏伟的综合性博物馆之一。收藏了世界各地约800万件文物，涵盖200万年的人类历史。馆内最著名的藏品包括罗塞塔石碑、帕特农神庙雕塑、埃及木乃伊等。',
      highlights: [
        '罗塞塔石碑 - 解开古埃及象形文字的关键',
        '埃及馆 - 木乃伊和法老文物收藏',
        '希腊罗马馆 - 帕特农神庙雕塑群',
        '中国馆 - 瓷器、青铜器、敦煌壁画',
        '中央大厅 - 壮观的玻璃天顶建筑'
      ],
      tips: [
        '建议至少预留3-4小时参观时间',
        '提前在官网下载地图规划路线',
        '馆内有中文讲解器租借（£7）',
        '周五晚上人少，适合深度游览',
        '纪念品店值得一逛，有精美复刻品'
      ],
      images: [
        'https://images.unsplash.com/photo-1550573307-52b75c9b046e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicml0aXNoJTIwbXVzZXVtJTIwbG9uZG9ufGVufDF8fHx8MTc2NDg4NDcxM3ww&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1550573307-52b75c9b046e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicml0aXNoJTIwbXVzZXVtJTIwbG9uZG9ufGVufDF8fHx8MTc2NDg4NDcxM3ww&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1550573307-52b75c9b046e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicml0aXNoJTIwbXVzZXVtJTIwbG9uZG9ufGVufDF8fHx8MTc2NDg4NDcxM3ww&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1550573307-52b75c9b046e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicml0aXNoJTIwbXVzZXVtJTIwbG9uZG9ufGVufDF8fHx8MTc2NDg4NDcxM3ww&ixlib=rb-4.1.0&q=80&w=1080'
      ],
      estimatedDuration: '3-4小时'
    },
    '白金汉宫': {
      name: '白金汉宫',
      nameEn: 'Buckingham Palace',
      address: 'Westminster, London SW1A 1AA',
      hours: '夏季（7-9月）09:30-19:30，其他季节关闭',
      ticketPrice: '£30（成人），£16.50（儿童）',
      description: '英国君主的办公地点和伦敦住所，也是世界上最具标志性的建筑之一。宫殿拥有775个房间，包括19间国事厅、52间王室和客房、188间工作人员卧室、92间办公室和78间浴室。',
      highlights: [
        '卫兵换岗仪式 - 每天11:00（夏季）举行',
        '国事厅 - 夏季对公众开放参观',
        '皇家花园 - 39英亩的私家花园',
        '维多利亚女王纪念碑 - 宫殿前的标志性雕像',
        '皇家马厩 - 皇家马车和仪仗队展览'
      ],
      tips: [
        '换岗仪式提前45分钟到达占据好位置',
        '内部参观需提前在线购票',
        '宫殿内禁止拍照，花园可以拍照',
        '穿舒适的鞋子，需要步行和站立很久',
        '附近的圣詹姆斯公园是拍照的绝佳地点'
      ],
      images: [
        'https://images.unsplash.com/photo-1647876761705-d0961f5aab21?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidWNraW5naGFtJTIwcGFsYWNlJTIwbG9uZG9ufGVufDF8fHx8MTc2NDg3MTEyNXww&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1647876761705-d0961f5aab21?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidWNraW5naGFtJTIwcGFsYWNlJTIwbG9uZG9ufGVufDF8fHx8MTc2NDg3MTEyNXww&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1647876761705-d0961f5aab21?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidWNraW5naGFtJTIwcGFsYWNlJTIwbG9uZG9ufGVufDF8fHx8MTc2NDg3MTEyNXww&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1647876761705-d0961f5aab21?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidWNraW5naGFtJTIwcGFsYWNlJTIwbG9uZG9ufGVufDF8fHx8MTc2NDg3MTEyNXww&ixlib=rb-4.1.0&q=80&w=1080'
      ],
      estimatedDuration: '2-3小时'
    }
  };

  return attractions[name] || null;
};
