import _groupBy from 'lodash/groupBy';
import { PatternInfo, ChangePointInfo, InsightInfo, TrendInfo, InsightType, OutlierInfo, HomogeneousPatternInfo, PointPatternInfo } from '../interface';
import { join, getDatumPositionString } from './util';

export const insightNameMap: Record<InsightType, string> = {
  category_outlier: 'outlier',
  trend: 'trend',
  change_point: 'change point',
  time_series_outlier: 'outlier',
};

type PatternTypeGroup = {
  type: InsightType;
  patternGroup: PatternInfo[];
};

const generateInsightCaption = (patternTypeGroups: PatternTypeGroup[], insight: InsightInfo<PatternInfo>): string => {
  const { subspaces, measures, breakdowns } = insight;
  const insightSubjects = join(patternTypeGroups.map((item) => insightNameMap[item.type]));
  const dataSubject = `${measures[0]?.field}(${measures[0]?.method}) by ${breakdowns[0]}`;
  const subspace = subspaces[0]
    ?.map((item) => {
      return `${item.value}(${item.dimension})`;
    })
    ?.join(',');
  return `${subspace ? `For (${subspace}), ` : ''}${insightSubjects} appearing in ${dataSubject}`;
};

const generateInsightTypeSummary = (patternTypeGroup: PatternTypeGroup, insight: InsightInfo<PatternInfo>): string => {
  const { patternGroup, type } = patternTypeGroup;
  const { measures, breakdowns, data } = insight;
  if (type === 'category_outlier' || type === 'time_series_outlier') {
    const outliers = patternGroup as OutlierInfo[];
    const outliersPositions = outliers.map((item) =>
      getDatumPositionString(data[item.index], breakdowns[0], measures[0].field)
    );
    const outliersPositionsString = join(outliersPositions);
    return `There are ${outliers.length} outliers in total, which are ${outliersPositionsString}.`;
  }
  if (type === 'change_point') {
    const changePoints = patternGroup as ChangePointInfo[];
    const changePointsPositions = changePoints.map((item) => data[item.index][breakdowns[0]]);
    const changePointsPositionsString = join(changePointsPositions);
    return `There are ${changePoints.length} abrupt changes in total, which occur in ${changePointsPositionsString}.`;
  }
  if (type === 'trend') {
    const trend = patternGroup as TrendInfo[];
    return `The ${measures[0].field} goes ${trend[0].trend}.`;
  }
  return '';
};

export const generateInsightDescription = (patterns: PatternInfo[], insight: InsightInfo<PatternInfo>) => {
  const patternGroups = _groupBy(patterns, 'type');
  const patternTypeGroups: PatternTypeGroup[] = Object.entries(patternGroups).map(([type, patternGroup]) => ({
    type,
    patternGroup,
  }));

  const caption = generateInsightCaption(patternTypeGroups, insight);

  const insightTypeSummarys = patternTypeGroups.map((typeGroup) => generateInsightTypeSummary(typeGroup, insight));

  return { caption, insightSummary: insightTypeSummarys };
};

export const generateHomogeneousInsightDescription = (insight: InsightInfo<HomogeneousPatternInfo>) => {
  const { subspaces, measures, breakdowns, patterns } = insight;
  const subspace = subspaces[0]
    ?.map((item) => {
      return `${item.value}(${item.dimension})`;
    })
    ?.join(',');

  const { type, insightType, childPatterns, commSet, exc } = patterns[0];

  const prefix = subspace ? `for ${subspace}, ` : '';

  const caption ='';

  let content = '';
  if (measures.length > 1) {
    const subject = type === 'commonness' ? join(commSet) : 'most measures';
    content = `${subject} have a common ${insightNameMap[insightType]}`;
    if (['change_point', 'outlier', 'time_series_outlier'].includes(insightType)) {
      const point = childPatterns[0] as PointPatternInfo;
      const positionString = ` in (${point.x}, ${point.y})`;
      content = `${prefix}${content}${positionString}`;
    }
    if (['trend'].includes(insightType)) {
      const trend = childPatterns[0] as TrendInfo;
      content = `${prefix}${content} of ${trend.trend}`;
    }
    if (type === 'exception' && exc) {
      content += `, except ${join(exc)}`;
    }
  } else {
    const subject = type === 'commonness' ? join(commSet) : `most ${breakdowns[0]}`;
    content = `${subject} have a common ${insightNameMap[insightType]}`;
    if (['change_point', 'outlier', 'time_series_outlier'].includes(insightType)) {
      const point = childPatterns[0] as PointPatternInfo;
      const positionString = ` in (${point.x}, ${point.y})`;
      content = `${prefix}${content}${positionString}`;
    }
    if (['trend'].includes(insightType)) {
      const trend = childPatterns[0] as TrendInfo;
      content = `${prefix}${content} of ${trend.trend}`;
    }
    if (type === 'exception' && exc) {
      content += `, except ${join(exc)}`;
    }
  }

  const insightTypeSummarys = [`${content}.`];

  return { caption, insightSummary: insightTypeSummarys };

};
