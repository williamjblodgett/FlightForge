import {describe,it,expect} from "vitest";
import {parseMapBounds,isInMapBounds,clampCoursePage,clusterMapCourses,toCourseMapSummary,nearbyMapBounds} from "./map-model";
import {courses} from "./demo-courses";
describe("full catalog map model",()=>{
  it("coarsens nearby location before constructing the search area",()=>{expect(nearbyMapBounds(43.66111,-70.25511)).toEqual(nearbyMapBounds(43.66001,-70.25501));const bounds=nearbyMapBounds(43.66,-70.26)!;expect(isInMapBounds({latitude:43.66,longitude:-70.26},bounds)).toBe(true);expect(bounds.north-bounds.south).toBeCloseTo(50/69);});
  it("rejects invalid locations and keeps polar searches bounded",()=>{expect(nearbyMapBounds(NaN,0)).toBeNull();expect(nearbyMapBounds(91,0)).toBeNull();expect(nearbyMapBounds(0,181)).toBeNull();const bounds=nearbyMapBounds(90,180)!;expect(bounds.north).toBe(90);expect(bounds.east).toBe(180);expect(bounds.west).toBeGreaterThanOrEqual(-180);});
  it("rejects invalid and inverted bounds",()=>{for(const value of ["",",,,","NaN,1,2,3","-181,1,2,3","1,2,0,4","1,2,3,91"])expect(parseMapBounds(value)).toBeNull();});
  it("finds a course outside the first list page",()=>{const c=courses[50];const b={west:c.longitude-.001,east:c.longitude+.001,south:c.latitude-.001,north:c.latitude+.001};expect(courses.filter(x=>isInMapBounds(x,b)).some(x=>x.id===c.id)).toBe(true);});
  it("clamps page bounds",()=>{expect(clampCoursePage("999",177)).toBe(8);expect(clampCoursePage("-1",0)).toBe(1);expect(clampCoursePage("1.5",25)).toBe(1);});
  it("keeps coincident cluster members addressable",()=>{const c=toCourseMapSummary(courses[0]);const rows=clusterMapCourses([c,{...c,id:"second"}],{west:c.longitude-1,east:c.longitude+1,south:c.latitude-1,north:c.latitude+1},375,500);expect(rows[0].courses).toHaveLength(2);});
});
