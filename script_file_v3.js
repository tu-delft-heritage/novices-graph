let data_men;
let data_fem;
let plot_colors;
let studies;
let options;

Promise.all([
    d3.json("male_at_tu.json"),         // Import male data
    d3.json("female_at_tu.json"),  // Import female data
    d3.json("colors.json")          // Json file with plot colors
]).then(function(data){
    data_men = data[0];
    data_fem = data[1];
    plot_colors = data[2];

    let fem_perc = [];
    for(var i = 0; i < Object.values(data_men["Totaal"]).length; i++){      // Calculate percentage
        var calc_percent = (Object.values(data_fem["Totaal"])[i]/(Object.values(data_men["Totaal"])[i]+Object.values(data_fem["Totaal"])[i]));
        if (isNaN(calc_percent)){   // Replace NAN with 0 (1944 is nan, since there were no students)
            fem_perc.push({
                x: new Date(Object.keys(data_fem["Totaal"])[i],0),
                y: 0
            })
        } else {
            fem_perc.push({
                x: new Date(Object.keys(data_fem["Totaal"])[i],0),
                y: calc_percent
            })
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
                    y: Object.values(data_fem[Object.keys(data_fem)[i]])[j]
                })
            }
            studies.push({  // Enter data and other specifics in graph dataset
                type: "stackedColumn",
                axisYType: "primary",
                showInLegend: false,
                name: Object.keys(data_fem)[i], 
                xValueFormatString: "YYYY",
                color: Object.values(plot_colors[Object.keys(data_fem)[i]]),
                dataPoints: d_points
          })
        }
    };

    studies.push({     // Enter calculated percentages in graph dataset
        type: "line",
        axisYType: "secondary",
        showInLegend: false,
        name: "Percentage",
        xValueFormatString: "YYYY",
        yValueFormatString: "##.#%",
        dataPoints: fem_perc
    });

    const chart = new CanvasJS.Chart(plot,{     // Graph properties
        title :{
            text: "Women at the TU Delft",
        },
        axisX:{
            title: "Year",
            intervalType: "year",
            labelAutoFit: true,
            labelWrap: false,
            labelAngle: 45,
            // maximum: new Date(2012,0), // Maximum x-value
            stripLines: [       // Vertical lines with specific information
                {   
                    label: "First Worldwar",
                    startValue: new Date(1914,0),
                    endValue: new Date(1918,0),
                    labelFontSize: 20,
                    labelBackgroundColor: "#ffffff00", // Transparent background for text
                    labelAlign: "center", // near, center or far. Vertical position
                    lineDashType: "solid",                
                    color:"#d8d8d8",
                    opacity: .8
                },
                {   
                    label: "Second Worldwar",
                    startValue: new Date(1938,0),
                    endValue: new Date(1945,0),
                    labelFontSize: 20,
                    labelBackgroundColor: "#ffffff00", // Transparent background for text
                    labelAlign: "center", // near, center or far. Vertical position
                    lineDashType: "solid",                
                    color:"#d8d8d8",
                    opacity: .8
                },
                {
                    label: "Oil Crisis",
                    value: new Date(1973,0),
                    thickness: 5,
                    labelFontSize: 20,
                    labelBackgroundColor: "#ffffff00", // Transparent background for text
                    labelAlign: "center", // near, center or far. Vertical position
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
                    labelAlign: "far", // near, center or far. Vertical position
                    labelMaxWidth: 250,
                    lineDashType: "dash",                
                    color:"#d8d8d8",
                    opacity: .8,
                    showOnTop: true
                }
            ]
        },
        axisY:{     // First Y-axis
            title: "Amount per Program",
            labelAutoFit: true,
        },
        axisY2:{    // Second Y-axis
            title: "Total Percentage",
            valueFormatString: "##.#%",
            minimum: 0,
            maximum: .35,
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
                temp = "<strong>" + e.entries[1].dataPoint.x.getFullYear() + "</strong>";
                str = str.concat(temp);
                for (var i = 0; i < e.entries.length; i++){
                    if(e.entries[i].dataPoint.y != 0){
                        if(e.entries[i].dataSeries.name == "Percentage"){       // Specific formatting for percentage
                            var temp = "<p style='color:" + e.entries[i].dataSeries.color + "'>" + "<strong>"+ Math.round(e.entries[i].dataPoint.y*1000)/10 + "%</strong> Female<br/> </p>";
                            str = str.concat(temp);
                        } else{         // Specific formatting for other data
                            var temp = "<p style='color:" + e.entries[i].dataSeries.color + "'>" + e.entries[i].dataSeries.name + ": <strong>"+ e.entries[i].dataPoint.y + "</strong> Female students<br/> </p>";
                            str = str.concat(temp);
                        }
                    }
                }
                var temp = "Total: " + data_fem["Totaal"][Number(e.entries[1].dataPoint.x.getFullYear())] + " Women </br>";
                str = str.concat(temp);
                var temp = "Total: " + data_men["Totaal"][Number(e.entries[1].dataPoint.x.getFullYear())] + " Men </br>";
                str = str.concat(temp);
                return (str)
            }
        },
        data: studies       // Add the data to the CanvasJS properties
    });



    chart.render();         // Render data


});