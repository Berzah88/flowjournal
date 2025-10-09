# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.swmansion.worklets.** { *; }

# react-native-gesture-handler
-keep class com.swmansion.gesturehandler.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Expo
-keep class expo.modules.** { *; }
-keep class com.facebook.react.ReactActivity { *; }
-keep class com.facebook.react.ReactActivityDelegate { *; }
-keep class com.facebook.react.ReactRootView { *; }
-keepclassmembers class com.facebook.react.ReactActivity {
    protected String getMainComponentName();
}

# React Native Firebase
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Preserve line number information for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Keep crashlytics
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# Add any project specific keep options here:
