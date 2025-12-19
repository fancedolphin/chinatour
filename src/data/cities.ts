/**
 * 中国城市数据
 * 包含主要省份、直辖市、自治区及热门旅游城市
 */

export interface City {
  code: string;
  name: string;
  province: string;
  popular?: boolean; // 热门旅游城市
}

export const chineseCities: City[] = [
  // 直辖市
  { code: 'BJ', name: '北京', province: '北京市', popular: true },
  { code: 'SH', name: '上海', province: '上海市', popular: true },
  { code: 'TJ', name: '天津', province: '天津市', popular: true },
  { code: 'CQ', name: '重庆', province: '重庆市', popular: true },

  // 河北省
  { code: 'SJZ', name: '石家庄', province: '河北省' },
  { code: 'TS', name: '唐山', province: '河北省' },
  { code: 'QHD', name: '秦皇岛', province: '河北省', popular: true },
  { code: 'HD', name: '邯郸', province: '河北省' },
  { code: 'XT', name: '邢台', province: '河北省' },
  { code: 'BD', name: '保定', province: '河北省' },
  { code: 'ZJK', name: '张家口', province: '河北省' },
  { code: 'CD', name: '承德', province: '河北省', popular: true },
  { code: 'CZ', name: '沧州', province: '河北省' },
  { code: 'LF', name: '廊坊', province: '河北省' },
  { code: 'HS', name: '衡水', province: '河北省' },

  // 山西省
  { code: 'TY', name: '太原', province: '山西省' },
  { code: 'DT', name: '大同', province: '山西省', popular: true },
  { code: 'YQ', name: '阳泉', province: '山西省' },
  { code: 'CZ_SX', name: '长治', province: '山西省' },
  { code: 'JC', name: '晋城', province: '山西省' },
  { code: 'SZ', name: '朔州', province: '山西省' },
  { code: 'JZ', name: '晋中', province: '山西省', popular: true },
  { code: 'YC', name: '运城', province: '山西省' },
  { code: 'XZ', name: '忻州', province: '山西省' },
  { code: 'LF_SX', name: '临汾', province: '山西省' },
  { code: 'LL', name: '吕梁', province: '山西省' },

  // 内蒙古自治区
  { code: 'HH', name: '呼和浩特', province: '内蒙古自治区' },
  { code: 'BT', name: '包头', province: '内蒙古自治区' },
  { code: 'WH', name: '乌海', province: '内蒙古自治区' },
  { code: 'CF', name: '赤峰', province: '内蒙古自治区' },
  { code: 'TL', name: '通辽', province: '内蒙古自治区' },
  { code: 'EDS', name: '鄂尔多斯', province: '内蒙古自治区' },
  { code: 'HLBE', name: '呼伦贝尔', province: '内蒙古自治区', popular: true },
  { code: 'BYZE', name: '巴彦淖尔', province: '内蒙古自治区' },
  { code: 'WL', name: '乌兰察布', province: '内蒙古自治区' },
  { code: 'XAM', name: '兴安盟', province: '内蒙古自治区' },
  { code: 'XLG', name: '锡林郭勒盟', province: '内蒙古自治区', popular: true },
  { code: 'ALS', name: '阿拉善盟', province: '内蒙古自治区' },

  // 辽宁省
  { code: 'SY', name: '沈阳', province: '辽宁省', popular: true },
  { code: 'DL', name: '大连', province: '辽宁省', popular: true },
  { code: 'AS', name: '鞍山', province: '辽宁省' },
  { code: 'FS', name: '抚顺', province: '辽宁省' },
  { code: 'BX', name: '本溪', province: '辽宁省' },
  { code: 'DD', name: '丹东', province: '辽宁省', popular: true },
  { code: 'JZ_LN', name: '锦州', province: '辽宁省' },
  { code: 'YK', name: '营口', province: '辽宁省' },
  { code: 'FX', name: '阜新', province: '辽宁省' },
  { code: 'LY', name: '辽阳', province: '辽宁省' },
  { code: 'PJ', name: '盘锦', province: '辽宁省' },
  { code: 'TL_LN', name: '铁岭', province: '辽宁省' },
  { code: 'CY', name: '朝阳', province: '辽宁省' },
  { code: 'HLD', name: '葫芦岛', province: '辽宁省' },

  // 吉林省
  { code: 'CC', name: '长春', province: '吉林省' },
  { code: 'JL', name: '吉林', province: '吉林省', popular: true },
  { code: 'SP', name: '四平', province: '吉林省' },
  { code: 'LY_JL', name: '辽源', province: '吉林省' },
  { code: 'TH', name: '通化', province: '吉林省' },
  { code: 'BS', name: '白山', province: '吉林省', popular: true },
  { code: 'SY_JL', name: '松原', province: '吉林省' },
  { code: 'BC', name: '白城', province: '吉林省' },
  { code: 'YBZ', name: '延边朝鲜族自治州', province: '吉林省', popular: true },

  // 黑龙江省
  { code: 'HRB', name: '哈尔滨', province: '黑龙江省', popular: true },
  { code: 'QQH', name: '齐齐哈尔', province: '黑龙江省' },
  { code: 'JXI', name: '鸡西', province: '黑龙江省' },
  { code: 'HG', name: '鹤岗', province: '黑龙江省' },
  { code: 'SYS', name: '双鸭山', province: '黑龙江省' },
  { code: 'DQ', name: '大庆', province: '黑龙江省' },
  { code: 'YC_HL', name: '伊春', province: '黑龙江省', popular: true },
  { code: 'JMS', name: '佳木斯', province: '黑龙江省' },
  { code: 'QTH', name: '七台河', province: '黑龙江省' },
  { code: 'MDJ', name: '牡丹江', province: '黑龙江省', popular: true },
  { code: 'HH_HL', name: '黑河', province: '黑龙江省' },
  { code: 'SH_HL', name: '绥化', province: '黑龙江省' },
  { code: 'DXAL', name: '大兴安岭地区', province: '黑龙江省' },

  // 江苏省
  { code: 'NJ', name: '南京', province: '江苏省', popular: true },
  { code: 'WX', name: '无锡', province: '江苏省', popular: true },
  { code: 'XZ_JS', name: '徐州', province: '江苏省' },
  { code: 'CZ_JS', name: '常州', province: '江苏省' },
  { code: 'SZ_JS', name: '苏州', province: '江苏省', popular: true },
  { code: 'NT', name: '南通', province: '江苏省' },
  { code: 'LYG', name: '连云港', province: '江苏省' },
  { code: 'HA', name: '淮安', province: '江苏省' },
  { code: 'YC_JS', name: '盐城', province: '江苏省' },
  { code: 'YZ', name: '扬州', province: '江苏省', popular: true },
  { code: 'ZJ', name: '镇江', province: '江苏省' },
  { code: 'TZ', name: '泰州', province: '江苏省' },
  { code: 'SQ', name: '宿迁', province: '江苏省' },

  // 浙江省
  { code: 'HZ', name: '杭州', province: '浙江省', popular: true },
  { code: 'NB', name: '宁波', province: '浙江省', popular: true },
  { code: 'WZ', name: '温州', province: '浙江省' },
  { code: 'JX', name: '嘉兴', province: '浙江省', popular: true },
  { code: 'HU', name: '湖州', province: '浙江省' },
  { code: 'SX_ZJ', name: '绍兴', province: '浙江省', popular: true },
  { code: 'JH', name: '金华', province: '浙江省' },
  { code: 'QZ', name: '衢州', province: '浙江省' },
  { code: 'ZS', name: '舟山', province: '浙江省', popular: true },
  { code: 'TZ_ZJ', name: '台州', province: '浙江省' },
  { code: 'LS', name: '丽水', province: '浙江省' },

  // 安徽省
  { code: 'HF', name: '合肥', province: '安徽省' },
  { code: 'WH_AH', name: '芜湖', province: '安徽省' },
  { code: 'BB', name: '蚌埠', province: '安徽省' },
  { code: 'HN', name: '淮南', province: '安徽省' },
  { code: 'MAS', name: '马鞍山', province: '安徽省' },
  { code: 'HB', name: '淮北', province: '安徽省' },
  { code: 'TL_AH', name: '铜陵', province: '安徽省' },
  { code: 'AQ', name: '安庆', province: '安徽省' },
  { code: 'HS_AH', name: '黄山', province: '安徽省', popular: true },
  { code: 'CZ_AH', name: '滁州', province: '安徽省' },
  { code: 'FY', name: '阜阳', province: '安徽省' },
  { code: 'SZ_AH', name: '宿州', province: '安徽省' },
  { code: 'LA', name: '六安', province: '安徽省' },
  { code: 'BZ', name: '亳州', province: '安徽省' },
  { code: 'CZ_AH2', name: '池州', province: '安徽省' },
  { code: 'XC', name: '宣城', province: '安徽省' },

  // 福建省
  { code: 'FZ', name: '福州', province: '福建省', popular: true },
  { code: 'XM', name: '厦门', province: '福建省', popular: true },
  { code: 'PT', name: '莆田', province: '福建省' },
  { code: 'SM', name: '三明', province: '福建省' },
  { code: 'QZ_FJ', name: '泉州', province: '福建省', popular: true },
  { code: 'ZZ', name: '漳州', province: '福建省' },
  { code: 'ND', name: '宁德', province: '福建省' },
  { code: 'LY_FJ', name: '龙岩', province: '福建省' },
  { code: 'NP', name: '南平', province: '福建省', popular: true },

  // 江西省
  { code: 'NC', name: '南昌', province: '江西省' },
  { code: 'JDZ', name: '景德镇', province: '江西省', popular: true },
  { code: 'PX', name: '萍乡', province: '江西省' },
  { code: 'JJ', name: '九江', province: '江西省', popular: true },
  { code: 'XY', name: '新余', province: '江西省' },
  { code: 'YT', name: '鹰潭', province: '江西省' },
  { code: 'GZ', name: '赣州', province: '江西省' },
  { code: 'JA', name: '吉安', province: '江西省' },
  { code: 'YC_JX', name: '宜春', province: '江西省' },
  { code: 'FZ_JX', name: '抚州', province: '江西省' },
  { code: 'SR', name: '上饶', province: '江西省', popular: true },

  // 山东省
  { code: 'JN', name: '济南', province: '山东省' },
  { code: 'QD', name: '青岛', province: '山东省', popular: true },
  { code: 'ZB', name: '淄博', province: '山东省', popular: true },
  { code: 'ZZ_SD', name: '枣庄', province: '山东省' },
  { code: 'DY', name: '东营', province: '山东省' },
  { code: 'YT_SD', name: '烟台', province: '山东省', popular: true },
  { code: 'WF', name: '潍坊', province: '山东省' },
  { code: 'JN_SD', name: '济宁', province: '山东省' },
  { code: 'TA', name: '泰安', province: '山东省', popular: true },
  { code: 'WH_SD', name: '威海', province: '山东省', popular: true },
  { code: 'RZ', name: '日照', province: '山东省' },
  { code: 'LW', name: '莱芜', province: '山东省' },
  { code: 'LY_SD', name: '临沂', province: '山东省' },
  { code: 'DZ', name: '德州', province: '山东省' },
  { code: 'LC', name: '聊城', province: '山东省' },
  { code: 'BZ_SD', name: '滨州', province: '山东省' },
  { code: 'HZ_SD', name: '菏泽', province: '山东省' },

  // 河南省
  { code: 'ZZ_HN', name: '郑州', province: '河南省' },
  { code: 'KF', name: '开封', province: '河南省', popular: true },
  { code: 'LY_HN', name: '洛阳', province: '河南省', popular: true },
  { code: 'PDS', name: '平顶山', province: '河南省' },
  { code: 'AY', name: '安阳', province: '河南省' },
  { code: 'HB_HN', name: '鹤壁', province: '河南省' },
  { code: 'XX', name: '新乡', province: '河南省' },
  { code: 'JZ_HN', name: '焦作', province: '河南省' },
  { code: 'PY', name: '濮阳', province: '河南省' },
  { code: 'XC_HN', name: '许昌', province: '河南省' },
  { code: 'LH', name: '漯河', province: '河南省' },
  { code: 'SMX', name: '三门峡', province: '河南省' },
  { code: 'NY', name: '南阳', province: '河南省' },
  { code: 'SQ_HN', name: '商丘', province: '河南省' },
  { code: 'XY_HN', name: '信阳', province: '河南省' },
  { code: 'ZK', name: '周口', province: '河南省' },
  { code: 'ZMD', name: '驻马店', province: '河南省' },

  // 湖北省
  { code: 'WH_HB', name: '武汉', province: '湖北省', popular: true },
  { code: 'HS_HB', name: '黄石', province: '湖北省' },
  { code: 'SY_HB', name: '十堰', province: '湖北省', popular: true },
  { code: 'YC_HB', name: '宜昌', province: '湖北省', popular: true },
  { code: 'XF', name: '襄阳', province: '湖北省' },
  { code: 'EZ', name: '鄂州', province: '湖北省' },
  { code: 'JM', name: '荆门', province: '湖北省' },
  { code: 'XG', name: '孝感', province: '湖北省' },
  { code: 'JZ_HB', name: '荆州', province: '湖北省' },
  { code: 'HG_HB', name: '黄冈', province: '湖北省' },
  { code: 'XN', name: '咸宁', province: '湖北省' },
  { code: 'SZ_HB', name: '随州', province: '湖北省' },
  { code: 'ES', name: '恩施土家族苗族自治州', province: '湖北省', popular: true },

  // 湖南省
  { code: 'CS', name: '长沙', province: '湖南省', popular: true },
  { code: 'ZZ_HUN', name: '株洲', province: '湖南省' },
  { code: 'XT_HUN', name: '湘潭', province: '湖南省' },
  { code: 'HY', name: '衡阳', province: '湖南省' },
  { code: 'SY_HUN', name: '邵阳', province: '湖南省' },
  { code: 'YY', name: '岳阳', province: '湖南省' },
  { code: 'CD_HUN', name: '常德', province: '湖南省' },
  { code: 'ZJJ', name: '张家界', province: '湖南省', popular: true },
  { code: 'YY_HUN', name: '益阳', province: '湖南省' },
  { code: 'CZ_HUN', name: '郴州', province: '湖南省' },
  { code: 'YZ_HUN', name: '永州', province: '湖南省' },
  { code: 'HH_HUN', name: '怀化', province: '湖南省' },
  { code: 'LD', name: '娄底', province: '湖南省' },
  { code: 'XX_HUN', name: '湘西土家族苗族自治州', province: '湖南省', popular: true },

  // 广东省
  { code: 'GZ_GD', name: '广州', province: '广东省', popular: true },
  { code: 'SG', name: '韶关', province: '广东省' },
  { code: 'SZ_GD', name: '深圳', province: '广东省', popular: true },
  { code: 'ZH', name: '珠海', province: '广东省', popular: true },
  { code: 'ST', name: '汕头', province: '广东省' },
  { code: 'FS_GD', name: '佛山', province: '广东省' },
  { code: 'JM_GD', name: '江门', province: '广东省' },
  { code: 'ZJ_GD', name: '湛江', province: '广东省' },
  { code: 'MM', name: '茂名', province: '广东省' },
  { code: 'ZQ', name: '肇庆', province: '广东省' },
  { code: 'HZ_GD', name: '惠州', province: '广东省' },
  { code: 'MZ', name: '梅州', province: '广东省' },
  { code: 'SW', name: '汕尾', province: '广东省' },
  { code: 'HY_GD', name: '河源', province: '广东省' },
  { code: 'YJ', name: '阳江', province: '广东省' },
  { code: 'QY', name: '清远', province: '广东省' },
  { code: 'DG', name: '东莞', province: '广东省' },
  { code: 'ZS_GD', name: '中山', province: '广东省' },
  { code: 'CZ_GD', name: '潮州', province: '广东省' },
  { code: 'JY', name: '揭阳', province: '广东省' },
  { code: 'YF', name: '云浮', province: '广东省' },

  // 广西壮族自治区
  { code: 'NN', name: '南宁', province: '广西壮族自治区' },
  { code: 'LZ', name: '柳州', province: '广西壮族自治区' },
  { code: 'GL', name: '桂林', province: '广西壮族自治区', popular: true },
  { code: 'WZ_GX', name: '梧州', province: '广西壮族自治区' },
  { code: 'BH', name: '北海', province: '广西壮族自治区', popular: true },
  { code: 'FCG', name: '防城港', province: '广西壮族自治区' },
  { code: 'QZ_GX', name: '钦州', province: '广西壮族自治区' },
  { code: 'GG', name: '贵港', province: '广西壮族自治区' },
  { code: 'YL', name: '玉林', province: '广西壮族自治区' },
  { code: 'BS_GX', name: '百色', province: '广西壮族自治区' },
  { code: 'HZ_GX', name: '贺州', province: '广西壮族自治区' },
  { code: 'HCH', name: '河池', province: '广西壮族自治区' },
  { code: 'LB', name: '来宾', province: '广西壮族自治区' },
  { code: 'CZ_GX', name: '崇左', province: '广西壮族自治区' },

  // 海南省
  { code: 'HK', name: '海口', province: '海南省', popular: true },
  { code: 'SY_HAN', name: '三亚', province: '海南省', popular: true },
  { code: 'SZ_HAN', name: '三沙', province: '海南省' },
  { code: 'DZ_HAN', name: '儋州', province: '海南省' },
  { code: 'WC', name: '五指山', province: '海南省' },
  { code: 'QH', name: '琼海', province: '海南省' },
  { code: 'WN', name: '万宁', province: '海南省' },
  { code: 'WZS', name: '文昌', province: '海南省' },

  // 四川省
  { code: 'CD_SC', name: '成都', province: '四川省', popular: true },
  { code: 'ZG', name: '自贡', province: '四川省' },
  { code: 'PZH', name: '攀枝花', province: '四川省' },
  { code: 'LZ_SC', name: '泸州', province: '四川省' },
  { code: 'DY_SC', name: '德阳', province: '四川省' },
  { code: 'MY', name: '绵阳', province: '四川省' },
  { code: 'GY', name: '广元', province: '四川省' },
  { code: 'SN', name: '遂宁', province: '四川省' },
  { code: 'NJ_SC', name: '内江', province: '四川省' },
  { code: 'LS_SC', name: '乐山', province: '四川省', popular: true },
  { code: 'NC_SC', name: '南充', province: '四川省' },
  { code: 'MS', name: '眉山', province: '四川省' },
  { code: 'YB', name: '宜宾', province: '四川省' },
  { code: 'GA', name: '广安', province: '四川省' },
  { code: 'DZ_SC', name: '达州', province: '四川省' },
  { code: 'YA', name: '雅安', province: '四川省' },
  { code: 'BZ_SC', name: '巴中', province: '四川省' },
  { code: 'ZY', name: '资阳', province: '四川省' },
  { code: 'ABZ', name: '阿坝藏族羌族自治州', province: '四川省', popular: true },
  { code: 'GZ_SC', name: '甘孜藏族自治州', province: '四川省', popular: true },
  { code: 'LSY', name: '凉山彝族自治州', province: '四川省', popular: true },

  // 贵州省
  { code: 'GY_GZ', name: '贵阳', province: '贵州省', popular: true },
  { code: 'LPS', name: '六盘水', province: '贵州省' },
  { code: 'ZY_GZ', name: '遵义', province: '贵州省' },
  { code: 'AS_GZ', name: '安顺', province: '贵州省', popular: true },
  { code: 'BJ_GZ', name: '毕节', province: '贵州省' },
  { code: 'TR', name: '铜仁', province: '贵州省' },
  { code: 'QXN', name: '黔西南布依族苗族自治州', province: '贵州省' },
  { code: 'QDN', name: '黔东南苗族侗族自治州', province: '贵州省', popular: true },
  { code: 'QN', name: '黔南布依族苗族自治州', province: '贵州省' },

  // 云南省
  { code: 'KM', name: '昆明', province: '云南省', popular: true },
  { code: 'QJ', name: '曲靖', province: '云南省' },
  { code: 'YX', name: '玉溪', province: '云南省' },
  { code: 'BOS', name: '保山', province: '云南省' },
  { code: 'ZT', name: '昭通', province: '云南省' },
  { code: 'LJ', name: '丽江', province: '云南省', popular: true },
  { code: 'PUER', name: '普洱', province: '云南省' },
  { code: 'LC_YN', name: '临沧', province: '云南省' },
  { code: 'CHX', name: '楚雄彝族自治州', province: '云南省' },
  { code: 'HH_YN', name: '红河哈尼族彝族自治州', province: '云南省' },
  { code: 'WS', name: '文山壮族苗族自治州', province: '云南省' },
  { code: 'XS', name: '西双版纳傣族自治州', province: '云南省', popular: true },
  { code: 'DH', name: '大理白族自治州', province: '云南省', popular: true },
  { code: 'DH_YN', name: '德宏傣族景颇族自治州', province: '云南省' },
  { code: 'NJ_YN', name: '怒江傈僳族自治州', province: '云南省' },
  { code: 'DQ_YN', name: '迪庆藏族自治州', province: '云南省', popular: true },

  // 西藏自治区
  { code: 'LS_XZ', name: '拉萨', province: '西藏自治区', popular: true },
  { code: 'RKZ', name: '日喀则', province: '西藏自治区', popular: true },
  { code: 'CD_XZ', name: '昌都', province: '西藏自治区' },
  { code: 'LZ_XZ', name: '林芝', province: '西藏自治区', popular: true },
  { code: 'SN_XZ', name: '山南', province: '西藏自治区' },
  { code: 'NQ', name: '那曲', province: '西藏自治区' },
  { code: 'AL', name: '阿里地区', province: '西藏自治区' },

  // 陕西省
  { code: 'XA', name: '西安', province: '陕西省', popular: true },
  { code: 'TC', name: '铜川', province: '陕西省' },
  { code: 'BJ_SN', name: '宝鸡', province: '陕西省' },
  { code: 'XY_SN', name: '咸阳', province: '陕西省' },
  { code: 'WN_SN', name: '渭南', province: '陕西省' },
  { code: 'YA_SN', name: '延安', province: '陕西省', popular: true },
  { code: 'HZ_SN', name: '汉中', province: '陕西省' },
  { code: 'YL_SN', name: '榆林', province: '陕西省' },
  { code: 'AK', name: '安康', province: '陕西省' },
  { code: 'SL', name: '商洛', province: '陕西省' },

  // 甘肃省
  { code: 'LZ_GS', name: '兰州', province: '甘肃省' },
  { code: 'JYG', name: '嘉峪关', province: '甘肃省', popular: true },
  { code: 'JS', name: '金昌', province: '甘肃省' },
  { code: 'BY', name: '白银', province: '甘肃省' },
  { code: 'TS_GS', name: '天水', province: '甘肃省' },
  { code: 'WW', name: '武威', province: '甘肃省' },
  { code: 'ZY_GS', name: '张掖', province: '甘肃省', popular: true },
  { code: 'PL', name: '平凉', province: '甘肃省' },
  { code: 'JQ', name: '酒泉', province: '甘肃省', popular: true },
  { code: 'QY_GS', name: '庆阳', province: '甘肃省' },
  { code: 'DX', name: '定西', province: '甘肃省' },
  { code: 'LN', name: '陇南', province: '甘肃省' },
  { code: 'LX', name: '临夏回族自治州', province: '甘肃省' },
  { code: 'GN', name: '甘南藏族自治州', province: '甘肃省', popular: true },

  // 青海省
  { code: 'XN_QH', name: '西宁', province: '青海省' },
  { code: 'HD_QH', name: '海东', province: '青海省' },
  { code: 'HB_QH', name: '海北藏族自治州', province: '青海省' },
  { code: 'HN_QH', name: '黄南藏族自治州', province: '青海省' },
  { code: 'HN_QH2', name: '海南藏族自治州', province: '青海省' },
  { code: 'GL_QH', name: '果洛藏族自治州', province: '青海省' },
  { code: 'YS', name: '玉树藏族自治州', province: '青海省' },
  { code: 'HX', name: '海西蒙古族藏族自治州', province: '青海省', popular: true },

  // 宁夏回族自治区
  { code: 'YC_NX', name: '银川', province: '宁夏回族自治区' },
  { code: 'SZS', name: '石嘴山', province: '宁夏回族自治区' },
  { code: 'WZ_NX', name: '吴忠', province: '宁夏回族自治区' },
  { code: 'GY_NX', name: '固原', province: '宁夏回族自治区' },
  { code: 'ZW', name: '中卫', province: '宁夏回族自治区', popular: true },

  // 新疆维吾尔自治区
  { code: 'WLMQ', name: '乌鲁木齐', province: '新疆维吾尔自治区', popular: true },
  { code: 'KL', name: '克拉玛依', province: '新疆维吾尔自治区' },
  { code: 'TLF', name: '吐鲁番', province: '新疆维吾尔自治区', popular: true },
  { code: 'HM', name: '哈密', province: '新疆维吾尔自治区' },
  { code: 'CJ', name: '昌吉回族自治州', province: '新疆维吾尔自治区' },
  { code: 'BETL', name: '博尔塔拉蒙古自治州', province: '新疆维吾尔自治区' },
  { code: 'BYG', name: '巴音郭楞蒙古自治州', province: '新疆维吾尔自治区', popular: true },
  { code: 'AKS', name: '阿克苏地区', province: '新疆维吾尔自治区' },
  { code: 'KZLS', name: '克孜勒苏柯尔克孜自治州', province: '新疆维吾尔自治区' },
  { code: 'KS', name: '喀什地区', province: '新疆维吾尔自治区', popular: true },
  { code: 'HT', name: '和田地区', province: '新疆维吾尔自治区' },
  { code: 'YL_XJ', name: '伊犁哈萨克自治州', province: '新疆维吾尔自治区', popular: true },
  { code: 'TC_XJ', name: '塔城地区', province: '新疆维吾尔自治区' },
  { code: 'ALT', name: '阿勒泰地区', province: '新疆维吾尔自治区', popular: true },
];

/**
 * 获取热门旅游城市
 */
export function getPopularCities(): City[] {
  return chineseCities.filter(city => city.popular);
}

/**
 * 按省份分组城市
 */
export function getCitiesByProvince(): Record<string, City[]> {
  return chineseCities.reduce((acc, city) => {
    if (!acc[city.province]) {
      acc[city.province] = [];
    }
    acc[city.province].push(city);
    return acc;
  }, {} as Record<string, City[]>);
}

/**
 * 搜索城市
 */
export function searchCities(query: string): City[] {
  if (!query) return chineseCities;
  const lowerQuery = query.toLowerCase();
  return chineseCities.filter(city => 
    city.name.toLowerCase().includes(lowerQuery) ||
    city.province.toLowerCase().includes(lowerQuery)
  );
}
