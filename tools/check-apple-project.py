#!/usr/bin/env python3
"""Check the generated Xcode Watch target before archive planning."""
import argparse,json,pathlib,plistlib,subprocess

def check_project(data,watch_info):
    objects=data.get('objects',{})
    targets={item.get('name'):item for item in objects.values()if item.get('isa')=='PBXNativeTarget'}
    watch=targets.get('BookWiz-Watch');phone=targets.get('BookWiz-iOS')
    if not watch or not phone:raise ValueError('The generated project is missing the iPhone or Watch target.')
    if watch.get('productType')!='com.apple.product-type.application':
        raise ValueError('BookWiz-Watch must be a modern watchOS application. The legacy WatchKit product type copies a stub that collides with the SwiftUI executable.')
    if watch_info.get('WKApplication')is not True or watch_info.get('WKWatchKitApp'):
        raise ValueError('The single-target SwiftUI Watch app must declare WKApplication, without the legacy WKWatchKitApp key.')
    source_paths=[]
    for phase_id in watch.get('buildPhases',[]):
        phase=objects.get(phase_id,{})
        if phase.get('isa')!='PBXSourcesBuildPhase':continue
        for build_id in phase.get('files',[]):
            file_ref=objects.get(objects.get(build_id,{}).get('fileRef'),{})
            source_paths.append(file_ref.get('path',''))
    if not any(pathlib.PurePosixPath(name).name=='BookWizWatchApp.swift'for name in source_paths):
        raise ValueError('The Watch SwiftUI entry point is missing from its Sources phase.')
    embedded=False
    for phase_id in phone.get('buildPhases',[]):
        phase=objects.get(phase_id,{})
        if phase.get('isa')=='PBXCopyFilesBuildPhase':
            embedded|=any(objects.get(item,{}).get('fileRef')==watch.get('productReference')for item in phase.get('files',[]))
    if not embedded:raise ValueError('The iPhone target is missing the embedded Watch app.')
    config_list=objects.get(watch.get('buildConfigurationList'),{})
    configurations=[objects.get(key,{})for key in config_list.get('buildConfigurations',[])]
    if not configurations or any(c.get('buildSettings',{}).get('SDKROOT')!='watchos'for c in configurations):
        raise ValueError('The Watch target must use the watchOS SDK in every configuration.')
    print('Generated Watch target verified: native SwiftUI app, watchOS SDK, compiled entry point and iPhone embedding.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project',type=pathlib.Path,required=True)
    args=parser.parse_args();project=args.project
    raw=subprocess.check_output(['plutil','-convert','json','-o','-',str(project/'project.pbxproj')])
    watch_info=plistlib.loads((project.parent/'Watch/Info.plist').read_bytes())
    try:check_project(json.loads(raw),watch_info)
    except ValueError as error:raise SystemExit(str(error))
