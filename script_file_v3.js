let data_men;
let data_fem;
let studies;
let options;

Promise.all([
    d3.json("male_at_tu.json"),         // Import male data
    d3.json("female_at_tu_cheat.json")  // Import female data, "cheat" is normalised so pre 2002 fit with post 2002
]).then(function(data){
    data_men = data[0];
    data_fem = data[1];

    let fem_perc = [];
    for(var i = 0; i < Object.values(data_men["Totaal"]).length; i++){      // Calculate percentage
        var calc_percent = (Object.values(data_fem["Totaal"])[i]/(Object.values(data_men["Totaal"])[i]+Object.values(data_fem["Totaal"])[i]));
        if (isNaN(calc_percent)){   // Replace NAN with 0 (1944 is nan, since there were no students)
            fem_perc.push({
                x: new Date(Object.keys(data_fem["Totaal"])[i],0),
                // x: Object.keys(data_fem["Totaal"])[i],
                y: 0
            })
        //   fem_perc.push(0);
        } else {
            fem_perc.push({
                x: new Date(Object.keys(data_fem["Totaal"])[i],0),
                // x: Object.keys(data_fem["Totaal"])[i],
                y: calc_percent
            })
        //   fem_perc.push(calc_percent.toFixed(1));
        }
    };

    studies = [];
    let exceptions = ["alle lessen", "enkele lessen", "ijker", "nan", "Totaal"];
    for(let i=0; i < Object.keys(data_fem).length; i++) {
        if(exceptions.includes(Object.keys(data_fem)[i])){      // Take words from "exceptions" out of the dataset
        } else {                                                // Enter females per faculty in a temporary array
            let d_points = [];
            for(let j=0; j < Object.values(data_fem[Object.keys(data_fem)[i]]).length; j++) {
                d_points.push({
                    x: new Date(Object.keys(data_fem[Object.keys(data_fem)[i]])[j],0),
                    // x: Object.keys(data_fem[Object.keys(data_fem)[i]])[j],
                    y: Object.values(data_fem[Object.keys(data_fem)[i]])[j]
                })
            }
            studies.push({  // Enter data and other specifics in graph dataset
                type: "stackedColumn",
                axisYType: "primary",
                showInLegend: true,
                name: Object.keys(data_fem)[i], 
                xValueFormatString: "YYYY",
                // toolTipContent: "{x} </br> {name}: {y} Female students",
                dataPoints: d_points
          })
        }
    };

    studies.push({     // Enter calculated percentages in graph dataset
        type: "line",
        axisYType: "secondary",
        showInLegend: true,
        name: "Percentage",
        xValueFormatString: "YYYY",
        yValueFormatString: "##.#%",
        // toolTipContent: " {x} </br> {y} at TU Delft",
        dataPoints: fem_perc
    });

    const chart = new CanvasJS.Chart(plot,{     // Graph properties
        title :{
            text: "Women at the TU Delft",
            fontSize: 32
        },
        height:1500,
        width:1500,
        axisX:{
            title: "Year",
            interval: 5,
            intervalType: "year",
            labelAutoFit: true,
            titleFontSize: 32,
            labelFontSize: 20,
            stripLines: [       // Vertical lines with specific information
                {   
                    label: "First worldwar",
                    startValue: new Date(1914,0),
                    endValue: new Date(1918,0),
                    labelFontSize: 20,
                    labelBackgroundColor: "#ffffff00", // Transparent background for text
                    labelAlign: "center", // near, center or far
                    lineDashType: "solid",                
                    color:"#d8d8d8",
                    opacity: .8
                },
                {   
                    label: "Second worldwar",
                    startValue: new Date(1938,0),
                    endValue: new Date(1945,0),
                    labelFontSize: 20,
                    labelBackgroundColor: "#ffffff00", // Transparent background for text
                    labelAlign: "center", // near, center or far
                    lineDashType: "solid",                
                    color:"#d8d8d8",
                    opacity: .8
                },
                {
                    label: "oil crisis",
                    value: new Date(1973,0),
                    thickness: 5,
                    labelFontSize: 20,
                    labelBackgroundColor: "#ffffff00", // Transparent background for text
                    labelAlign: "center", // near, center or far
                    lineDashType: "dash",                
                    color:"#d8d8d8",
                    opacity: .8
                },
                {
                    label: "Intoduction of Bachelor Master system",
                    value: new Date(2002,0),
                    thickness: 5,
                    labelFontSize: 20,
                    labelBackgroundColor: "#ffffff00", // Transparent background for text
                    labelAlign: "center", // near, center or far
                    lineDashType: "dash",                
                    color:"#d8d8d8",
                    opacity: .8
                }
            ]
        },
        axisY:{     // First Y-axis
            title: "Amount per program",
            labelAutoFit: true,
            titleFontSize: 28,
            labelFontSize: 20
        },
        axisY2:{    // Second Y-axis
            title: "Total percentage",
            valueFormatString: "##.#%",
            minimum: 0,
            maximum: .35,
            titleFontSize: 28,
            labelFontSize: 20
        },
        legend: {
            fontSize:20
        },
        toolTip:{   // Tooltip properties
            enabled: true,
            animationEnabled: true,
            shared: true, 
            contentFormatter: function(e) {     // Custom formatter for tooltip
                var str = "";
                for (var i = 0; i < e.entries.length; i++){
                    if(e.entries[i].dataPoint.y != 0){
                        if(e.entries[i].dataSeries.name == "Percentage"){       // Specific formatting for percentage
                            var temp = "<p style='color:" + e.entries[i].dataSeries.color + "'>" + e.entries[i].dataSeries.name + "<strong> "+ Math.round(e.entries[i].dataPoint.y*1000)/10 + "%</strong> <br/> </p>";
                            str = str.concat(temp);
                        } else{         // Specific formatting for other data
                            var temp = "<p style='color:" + e.entries[i].dataSeries.color + "'>" + e.entries[i].dataSeries.name + ": <strong>"+ e.entries[i].dataPoint.y + "</strong> Female students<br/> </p>";
                            str = str.concat(temp);
                        }
                        
                    }
                }
                return (str)
            }
        },
        data: studies       // Add the data to the CanvasJS properties
    });



    chart.render();         // Render data


});